'use client';

// Theme5 Deposit — amount, then how to pay:
//   • Instant Checkout     — Paygate's secure checkout popup
//   • UPI / Bank Transfer  — P2P·PAY's hosted payment page
//   • Manual Payment       — pay into our account, then submit the UTR and a
//                            screenshot for an admin to verify
// Options not set up yet are shown as unavailable. Deposits are credited only
// after admin approval.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, Landmark, Loader2, Lock, Smartphone, Upload, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';
import { useDepositGateways } from '@/hooks/useDepositGateways';
import { useManualDeposit } from '@/hooks/useManualDeposit';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { T5Card, t5Input, t5BtnPrimary, T5FormPage } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const GATEWAY_ICONS = { card: CreditCard, upi: Smartphone, manual: Landmark };
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Theme5's light palette for the shared "send payment to" block.
const RECEIVING_STYLES = {
  card: 'mt-4 rounded-xl border border-black/[0.06] bg-white p-6 shadow-sm',
  title: 'text-sm font-black text-[#0f1b33]',
  note: 'mt-1 text-xs text-[#64748b]',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f8fafc] px-4 py-3',
  label: 'text-[0.65rem] font-black uppercase tracking-wide text-[#94a3b8]',
  value: 'break-all font-bold text-[#0f1b33]',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-md border border-[#1d4ed8]/30 bg-white px-3 py-1.5 text-xs font-black text-[#1d4ed8] transition hover:bg-[#eff4ff]',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-lg bg-[#f1f5f9] p-3 text-xs text-[#334155]',
};

export default function Theme5Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const {
    pay,
    paying,
    redirecting,
    resuming,
    error: payError,
    receipt: payReceipt,
    reset: resetPay,
  } = usePaygateDeposit();
  const {
    gateways,
    selected: gateway,
    selectedGateway,
    setSelected: setGateway,
    loading: gatewaysLoading,
    error: gatewaysError,
  } = useDepositGateways(Boolean(token));
  const manual = useManualDeposit(Boolean(token));
  const [amount, setAmount] = useState('');
  const [hasPending, setHasPending] = useState(false);
  const numAmount = parseFloat(amount) || 0;
  const isManual = selectedGateway?.flow === 'manual';
  const receipt = payReceipt ?? manual.receipt;
  const manualBlocker = isManual ? manual.blocker(numAmount) : null;
  const busy = paying || manual.submitting;
  const canPay =
    !busy &&
    !hasPending &&
    numAmount >= MIN_DEPOSIT &&
    !receipt &&
    Boolean(selectedGateway?.available) &&
    !(isManual && manualBlocker);

  const loadPending = () =>
    api('/api/v1/wallet')
      .then((w) => setHasPending(Boolean(w?.hasPendingDeposit)))
      .catch(() => {});

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (token) loadPending();
  }, [token]);

  const chooseGateway = (code) => {
    setGateway(code);
    resetPay();
    manual.setError(null);
  };

  const submit = async () => {
    if (!canPay) return;
    try {
      if (isManual) await manual.submit({ amount: numAmount });
      else await pay({ amount: numAmount, gateway });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) router.replace('/login');
    }
  };

  const payLabel = hasPending
    ? 'Deposit Pending Approval'
    : resuming
      ? 'Checking payment…'
      : redirecting
        ? 'Taking you to payment…'
        : paying
          ? 'Opening payment…'
          : isManual
            ? manual.submitting
              ? 'Submitting…'
              : 'Submit for approval'
            : `Pay ${inr(numAmount)}`;

  let helper = null;
  if (selectedGateway && !hasPending) {
    if (isManual) {
      helper =
        numAmount >= MIN_DEPOSIT && manualBlocker
          ? manualBlocker
          : 'An admin will verify your UTR and screenshot, then credit your wallet.';
    } else if (selectedGateway.flow === 'redirect') {
      helper = 'You will finish paying on a secure page, then come back here.';
    } else {
      helper = 'A secure checkout window will open.';
    }
  }

  const errorText = payError || manual.error;

  return (
    <T5FormPage
      title="Deposit"
      tabs={[
        { label: 'Deposit', href: '/deposit', active: true },
        { label: 'Withdrawals', href: '/withdraw' },
      ]}
    >
      {hasPending && !receipt && !resuming ? (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}
      <T5Card className="mt-4 p-6">
        <label className="text-sm text-[#64748b]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t5Input} mt-2 text-2xl`}
          disabled={Boolean(receipt) || busy}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              disabled={Boolean(receipt) || busy}
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0f1b33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-50"
            >
              {inr(a)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#94a3b8]">Minimum deposit {inr(MIN_DEPOSIT)}.</p>
      </T5Card>

      {!receipt ? (
        <T5Card className="mt-4 p-6">
          <p id="t5-gateway-label" className="text-sm text-[#64748b]">
            Payment method
          </p>
          {gatewaysLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#64748b]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payment methods…
            </p>
          ) : gatewaysError || gateways.length === 0 ? (
            <p className="mt-3 text-sm text-[#64748b]">
              {gatewaysError || 'No payment methods are available right now. Please try again later.'}
            </p>
          ) : (
            <>
              <div role="radiogroup" aria-labelledby="t5-gateway-label" className="mt-3 space-y-2">
                {gateways.map((g) => {
                  const Icon = GATEWAY_ICONS[g.icon] ?? CreditCard;
                  const active = g.available && g.code === gateway;
                  return (
                    <button
                      key={g.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={!g.available}
                      disabled={!g.available || busy}
                      onClick={() => chooseGateway(g.code)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left shadow-sm transition ${
                        !g.available
                          ? 'cursor-not-allowed border-black/5 bg-[#f8fafc] opacity-60'
                          : active
                            ? 'border-[#1d4ed8] bg-[#eff4ff]'
                            : 'border-black/10 bg-white hover:border-[#1d4ed8]/50 disabled:opacity-60'
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          active ? 'bg-[#1d4ed8] text-white' : 'bg-[#f1f5f9] text-[#0f1b33]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[#0f1b33]">{g.name}</span>
                        <span className="mt-0.5 block text-xs text-[#64748b]">
                          {g.available ? g.description : 'Not available right now'}
                        </span>
                      </span>
                      {g.available ? (
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                            active ? 'border-[#1d4ed8]' : 'border-black/20'
                          }`}
                        >
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#e2e8f0] px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-[#64748b]">
                          Unavailable
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!gateways.some((g) => g.available) && (
                <p className="mt-3 text-xs text-[#64748b]">
                  No payment method is set up yet. Please try again later or contact support.
                </p>
              )}
            </>
          )}
        </T5Card>
      ) : null}

      {!receipt && isManual && !hasPending ? (
        <T5ManualPayment manual={manual} amount={numAmount} />
      ) : null}

      {errorText && !receipt ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {errorText}
        </p>
      ) : null}

      {!receipt ? (
        <>
          <button type="button" onClick={submit} disabled={!canPay} className={`${t5BtnPrimary} mt-4 w-full`}>
            {payLabel}
          </button>
          {helper ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[#94a3b8]">
              {!isManual && <Lock className="h-3.5 w-3.5 shrink-0" />}
              {helper}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-[#1d4ed8]/25 bg-[#eff4ff] p-4 text-center">
          <p className="text-sm font-black text-[#1d4ed8]">
            {receipt.gateway === 'manual'
              ? 'Deposit submitted'
              : receipt.status === 'success'
                ? 'Deposit successful'
                : receipt.status === 'failed'
                  ? 'Payment failed'
                  : receipt.status === 'awaiting_approval'
                    ? 'Payment received'
                    : 'Payment pending'}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {receipt.gateway === 'manual'
              ? `${inr(receipt.amount)} awaiting admin verification · UTR ${receipt.utr} · ID ${receipt.transactionId}`
              : receipt.status === 'success'
                ? `${inr(receipt.amount)} credited · ID ${receipt.transactionId}`
                : receipt.status === 'awaiting_approval'
                  ? `${inr(receipt.amount)} awaiting admin approval · ID ${receipt.transactionId}`
                  : `Request ID: ${receipt.transactionId}`}
          </p>
          <button
            type="button"
            onClick={() => {
              resetPay();
              manual.reset();
              setAmount('');
              loadPending();
            }}
            className={`${t5BtnPrimary} mt-4 w-full`}
          >
            New deposit
          </button>
        </div>
      )}
    </T5FormPage>
  );
}

function T5ManualPayment({ manual, amount }) {
  const {
    methods,
    methodsLoading,
    methodsError,
    methodCode,
    setMethodCode,
    selectedMethod,
    reference,
    setReference,
    utrValid,
    proofFile,
    proofPreview,
    proofUrl,
    proofError,
    uploading,
    fileInputRef,
    pickProof,
    clearProof,
  } = manual;

  if (methodsLoading) {
    return (
      <T5Card className="mt-4 flex items-center gap-2 p-6 text-sm text-[#64748b]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…
      </T5Card>
    );
  }
  if (!selectedMethod) {
    return (
      <T5Card className="mt-4 p-6 text-sm text-[#64748b]">
        {methodsError || 'Manual payment details are not set up yet. Please choose another method.'}
      </T5Card>
    );
  }

  return (
    <>
      {methods.length > 1 ? (
        <T5Card className="mt-4 p-6">
          <p id="t5-manual-account-label" className="text-sm text-[#64748b]">
            Pay to
          </p>
          <div role="radiogroup" aria-labelledby="t5-manual-account-label" className="mt-3 flex flex-wrap gap-2">
            {methods.map((m) => {
              const active = m.code === methodCode;
              return (
                <button
                  key={m.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethodCode(m.code)}
                  className={`rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition ${
                    active
                      ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white'
                      : 'border-black/10 bg-white text-[#0f1b33] hover:border-[#1d4ed8] hover:text-[#1d4ed8]'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </T5Card>
      ) : null}

      <ReceivingDetails
        method={selectedMethod}
        styles={RECEIVING_STYLES}
        title={`Send ${inr(amount || 0)} to ${selectedMethod.name}`}
      />

      <T5Card className="mt-4 p-6">
        <p className="text-sm font-black text-[#0f1b33]">Confirm your payment</p>
        <p className="mt-1 text-xs text-[#64748b]">
          After paying, enter the UTR from your payment app and upload a screenshot.
        </p>

        <label htmlFor="t5-manual-utr" className="mt-4 block text-sm text-[#64748b]">
          UTR / transaction reference
        </label>
        <input
          id="t5-manual-utr"
          type="text"
          autoComplete="off"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. 412345678901"
          className={`${t5Input} mt-2 font-mono`}
        />
        {reference && !utrValid ? (
          <p className="mt-1.5 text-xs font-semibold text-amber-600">
            Use letters and numbers only (UPI UTRs are 12 digits).
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-[#94a3b8]">UPI UTRs are 12 digits.</p>
        )}

        <p className="mt-4 text-sm text-[#64748b]">Payment screenshot</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => pickProof(e.target.files?.[0])}
          className="hidden"
        />
        {!proofPreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-[#f8fafc] px-4 py-6 text-center transition hover:border-[#1d4ed8] hover:bg-[#eff4ff]"
          >
            <Upload className="h-6 w-6 text-[#1d4ed8]" />
            <span className="text-sm font-black text-[#0f1b33]">Upload payment screenshot</span>
            <span className="text-xs text-[#94a3b8]">PNG, JPG or WEBP · up to 5MB</span>
          </button>
        ) : (
          <div className="mt-2 rounded-lg border border-black/10 bg-[#f8fafc] p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Payment screenshot preview"
                className="h-24 w-24 shrink-0 rounded-lg border border-black/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0f1b33]">{proofFile?.name}</p>
                <p className="mt-0.5 text-xs text-[#94a3b8]">
                  {((proofFile?.size ?? 0) / 1024).toFixed(0)} KB
                </p>
                {uploading && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#1d4ed8]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                  </p>
                )}
                {proofUrl && !uploading && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Uploaded
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearProof}
                aria-label="Remove screenshot"
                className="rounded-md p-1 text-[#94a3b8] transition hover:bg-black/5 hover:text-[#0f1b33]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {proofError && <p className="mt-2 text-xs font-semibold text-red-600">{proofError}</p>}
      </T5Card>
    </>
  );
}
