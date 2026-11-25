'use client';

// Deposit — amount, then choose how to pay:
//   • Instant Checkout     — Paygate's secure checkout popup
//   • UPI / Bank Transfer  — P2P·PAY's hosted payment page
//   • Manual Payment       — pay into our account, then submit the UTR and a
//                            screenshot for an admin to verify
// Every option is always listed; one that is not set up yet (keys missing in
// the API's .env, or no active payment method) shows as unavailable. Deposits
// are credited only after admin approval.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';
import { useDepositGateways } from '@/hooks/useDepositGateways';
import { useManualDeposit } from '@/hooks/useManualDeposit';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const STEPS = ['Amount', 'Payment'];
const GATEWAY_ICONS = { card: CreditCard, upi: Smartphone, manual: Landmark };
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Theme1's glass palette for the shared "send payment to" block.
const RECEIVING_STYLES = {
  card: 'card-glass p-6',
  title: 'text-sm font-semibold',
  note: 'mt-1 text-xs text-slate-500',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-700 px-4 py-3',
  label: 'text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500',
  value: 'break-all font-medium text-white',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-brand-400 transition hover:bg-white/5',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-white/10 bg-white object-contain p-1',
  instructions:
    'mt-4 whitespace-pre-line rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300',
};

export default function Theme1Deposit() {
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

  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const [pendingChecked, setPendingChecked] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;
  const isManual = selectedGateway?.flow === 'manual';
  const receipt = payReceipt ?? manual.receipt;
  const manualBlocker = isManual ? manual.blocker(numAmount) : null;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api('/api/v1/wallet')
      .then((w) => {
        if (!cancelled) setHasPending(Boolean(w?.hasPendingDeposit));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPendingChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!receipt) return;
    setStep('done');
    // A deposit now waits on the admin; a new one is refused until then.
    if (receipt.status === 'awaiting_approval') setHasPending(true);
  }, [receipt]);

  const stepIndex = { amount: 0, pay: 1, done: 1 }[step];

  const chooseGateway = (code) => {
    setGateway(code);
    setError(null);
    resetPay();
    manual.setError(null);
  };

  const startPay = async () => {
    if (!selectedGateway?.available || (isManual && manualBlocker)) return;
    setError(null);
    try {
      if (isManual) await manual.submit({ amount: numAmount });
      else await pay({ amount: numAmount, gateway });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start payment';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      setError(msg);
    }
  };

  const reset = () => {
    resetPay();
    manual.reset();
    setStep('amount');
    setAmount('');
    setError(null);
  };

  if (!isHydrated || !token || !pendingChecked) return null;

  const formLocked = hasPending && step !== 'done' && !resuming && !receipt;
  const bannerError = error || (step !== 'done' ? payError : null);
  const showForm = !formLocked && !resuming && !receipt;

  let helper = null;
  if (selectedGateway) {
    if (isManual) {
      helper =
        manualBlocker ?? 'An admin will verify your UTR and screenshot, then credit your wallet.';
    } else if (selectedGateway.flow === 'redirect') {
      helper = 'You will finish paying on a secure page, then come back here.';
    } else {
      helper = 'A secure checkout window will open.';
    }
  }

  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Deposit</h1>
      {showForm && step !== 'done' && <Stepper steps={STEPS} current={stepIndex} />}

      {bannerError && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {bannerError}
        </p>
      )}

      {resuming && (
        <section className="card-glass mt-6 p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
          <p className="mt-4 text-lg font-semibold">Checking your payment…</p>
          <p className="mt-1 text-sm text-slate-400">This only takes a moment.</p>
        </section>
      )}

      {formLocked && (
        <section className="card-glass mt-6 p-8 text-center">
          <Clock className="mx-auto h-14 w-14 text-brand-400" />
          <h2 className="mt-4 text-xl font-bold">Deposit pending approval</h2>
          <p className="mt-2 text-sm text-slate-400">
            You already have a deposit request awaiting approval. You can place a new
            one once it has been approved or rejected.
          </p>
          <Link
            href="/wallet"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 font-semibold text-surface-900 transition hover:bg-brand-400"
          >
            Go to wallet
          </Link>
        </section>
      )}

      {showForm && step === 'amount' && (
        <div className="mt-6 space-y-6">
          <section className="card-glass p-6">
            <label className="text-sm text-slate-400">Enter amount</label>
            <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-surface-700 px-4">
              <span className="text-2xl text-slate-500">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent px-2 py-4 text-2xl text-white outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`rounded-lg px-4 py-2 text-sm transition ${
                    numAmount === a ? 'bg-brand-500 text-surface-900' : 'bg-surface-700 hover:bg-brand-500/20'
                  }`}
                >
                  {inr(a)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Minimum deposit {inr(MIN_DEPOSIT)}.</p>
          </section>

          <button
            type="button"
            onClick={() => valid && setStep('pay')}
            disabled={!valid}
            className="w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {showForm && step === 'pay' && (
        <div className="mt-6 space-y-6">
          <section className="card-glass flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold">Secure checkout</p>
              <p className="text-xs text-slate-500">
                {selectedGateway
                  ? `Pay ${inr(numAmount)} with ${selectedGateway.name}`
                  : `Pay ${inr(numAmount)}`}
              </p>
            </div>
            <span className="text-lg font-bold text-gradient-gold">{inr(numAmount)}</span>
          </section>

          {paying ? (
            <section className="card-glass p-8 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
              <p className="mt-4 text-lg font-semibold">
                {redirecting ? 'Taking you to the payment page…' : 'Opening secure payment…'}
              </p>
              <p className="mt-1 text-sm text-slate-400">Do not close this window.</p>
            </section>
          ) : (
            <>
              <GatewayPicker
                gateways={gateways}
                selected={gateway}
                onSelect={chooseGateway}
                loading={gatewaysLoading}
                error={gatewaysError}
              />

              {isManual && <ManualPayment manual={manual} amount={numAmount} />}

              <div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('amount')}
                    className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={startPay}
                    disabled={
                      !selectedGateway?.available ||
                      (isManual && (Boolean(manualBlocker) || manual.submitting))
                    }
                    className="flex-[2] rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isManual
                      ? manual.submitting
                        ? 'Submitting…'
                        : 'Submit for approval'
                      : `Pay ${inr(numAmount)}`}
                  </button>
                </div>
                {helper && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                    {!isManual && <Lock className="h-3.5 w-3.5 shrink-0" />}
                    {helper}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'done' && receipt && (
        <div className="mt-8 space-y-6">
          {receipt.gateway === 'manual' ? (
            <section className="card-glass p-8 text-center">
              <Clock className="mx-auto h-14 w-14 text-brand-400" />
              <h2 className="mt-4 text-xl font-bold">Deposit submitted</h2>
              <p className="mt-1 text-sm text-slate-400">
                {inr(receipt.amount)} is awaiting admin verification. Your wallet will be
                credited once it is approved.
              </p>
              <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
                <Row label="Amount" value={inr(receipt.amount)} />
                <Row label="Paid to" value={receipt.method} />
                <Row label="UTR" value={receipt.utr} />
                <Row label="Transaction ID" value={`#${receipt.transactionId}`} />
                <Row label="Status" value="Pending approval" last />
              </div>
            </section>
          ) : (
            <section className="card-glass p-8 text-center">
              {receipt.status === 'success' ? (
                <Check className="mx-auto h-14 w-14 text-green-400" />
              ) : receipt.status === 'failed' ? (
                <X className="mx-auto h-14 w-14 text-red-400" />
              ) : (
                <Clock className="mx-auto h-14 w-14 text-brand-400" />
              )}
              <h2 className="mt-4 text-xl font-bold">
                {receipt.status === 'success'
                  ? 'Deposit successful'
                  : receipt.status === 'failed'
                    ? 'Payment failed'
                    : receipt.status === 'awaiting_approval'
                      ? 'Payment received'
                      : 'Payment pending'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {receipt.status === 'success'
                  ? `${inr(receipt.amount)} has been credited to your wallet.`
                  : receipt.status === 'failed'
                    ? 'The payment did not go through. You can try again.'
                    : receipt.status === 'awaiting_approval'
                      ? `${inr(receipt.amount)} is awaiting admin approval. It will be credited once approved.`
                      : 'Waiting for the gateway to confirm this payment.'}
              </p>
              <div className="mt-6 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left text-sm">
                <Row label="Amount" value={inr(receipt.amount)} />
                <Row label="Transaction ID" value={`#${receipt.transactionId}`} />
                <Row
                  label="Status"
                  value={
                    receipt.status === 'success'
                      ? 'Completed'
                      : receipt.status === 'failed'
                        ? 'Failed'
                        : receipt.status === 'awaiting_approval'
                          ? 'Awaiting approval'
                          : 'Pending'
                  }
                  last
                />
              </div>
            </section>
          )}
          <div className="flex gap-3">
            {hasPending ? (
              <p className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-xs text-slate-400">
                You can place a new deposit once this one is approved or rejected.
              </p>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl border border-white/15 py-4 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                New deposit
              </button>
            )}
            <Link
              href="/wallet"
              className="flex-1 rounded-xl bg-brand-500 py-4 text-center font-semibold text-surface-900 transition hover:bg-brand-400"
            >
              Go to wallet
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function GatewayPicker({ gateways, selected, onSelect, loading, error }) {
  if (loading) {
    return (
      <section className="card-glass flex items-center gap-3 p-5 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment methods…
      </section>
    );
  }
  if (error || gateways.length === 0) {
    return (
      <section className="card-glass p-5 text-sm text-slate-400">
        {error || 'No payment methods are available right now. Please try again later.'}
      </section>
    );
  }
  const noneAvailable = !gateways.some((g) => g.available);
  return (
    <section className="card-glass p-5">
      <p id="gateway-label" className="text-sm font-semibold">
        Choose payment method
      </p>
      <div role="radiogroup" aria-labelledby="gateway-label" className="mt-3 space-y-2">
        {gateways.map((g) => {
          const Icon = GATEWAY_ICONS[g.icon] ?? CreditCard;
          const active = g.available && g.code === selected;
          return (
            <button
              key={g.code}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={!g.available}
              disabled={!g.available}
              onClick={() => onSelect(g.code)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                !g.available
                  ? 'cursor-not-allowed border-white/5 opacity-50'
                  : active
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/[0.03]'
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  active ? 'bg-brand-500 text-surface-900' : 'bg-surface-700 text-slate-300'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{g.name}</span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  {g.available ? g.description : 'Not available right now'}
                </span>
              </span>
              {g.available ? (
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    active ? 'border-brand-500' : 'border-white/25'
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />}
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                  Unavailable
                </span>
              )}
            </button>
          );
        })}
      </div>
      {noneAvailable && (
        <p className="mt-3 text-xs text-slate-500">
          No payment method is set up yet. Please try again later or contact support.
        </p>
      )}
    </section>
  );
}

function ManualPayment({ manual, amount }) {
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
      <section className="card-glass flex items-center gap-3 p-5 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…
      </section>
    );
  }
  if (!selectedMethod) {
    return (
      <section className="card-glass p-5 text-sm text-slate-400">
        {methodsError || 'Manual payment details are not set up yet. Please choose another method.'}
      </section>
    );
  }

  return (
    <>
      {methods.length > 1 && (
        <section className="card-glass p-5">
          <p id="manual-account-label" className="text-sm font-semibold">
            Pay to
          </p>
          <div role="radiogroup" aria-labelledby="manual-account-label" className="mt-3 flex flex-wrap gap-2">
            {methods.map((m) => {
              const active = m.code === methodCode;
              return (
                <button
                  key={m.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethodCode(m.code)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-brand-500 text-surface-900'
                      : 'bg-surface-700 text-white hover:bg-brand-500/20'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <ReceivingDetails
        method={selectedMethod}
        styles={RECEIVING_STYLES}
        title={`Send ${inr(amount)} to ${selectedMethod.name}`}
      />

      <section className="card-glass p-6">
        <h2 className="text-sm font-semibold">Confirm your payment</h2>
        <p className="mt-1 text-xs text-slate-500">
          After paying, enter the UTR from your payment app and upload a screenshot.
        </p>

        <label htmlFor="manual-utr" className="mt-4 block text-sm text-slate-400">
          UTR / transaction reference
        </label>
        <input
          id="manual-utr"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. 412345678901"
          className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 font-mono text-white outline-none focus:border-brand-500/60"
        />
        {reference && !utrValid ? (
          <p className="mt-1.5 text-xs text-amber-400">
            Use letters and numbers only (UPI UTRs are 12 digits).
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">UPI UTRs are 12 digits.</p>
        )}

        <p className="mt-4 text-sm text-slate-400">Payment screenshot</p>
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
            className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-6 text-center transition hover:border-brand-500/60 hover:bg-white/[0.02]"
          >
            <Upload className="h-6 w-6 text-brand-400" />
            <span className="text-sm font-medium text-white">Upload payment screenshot</span>
            <span className="text-xs text-slate-500">PNG, JPG or WEBP · up to 5MB</span>
          </button>
        ) : (
          <div className="mt-2 rounded-xl border border-white/10 bg-surface-700 p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Payment screenshot preview"
                className="h-24 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{proofFile?.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {((proofFile?.size ?? 0) / 1024).toFixed(0)} KB
                </p>
                {uploading && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                  </p>
                )}
                {proofUrl && !uploading && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
                    <Check className="h-3.5 w-3.5" /> Uploaded
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearProof}
                aria-label="Remove screenshot"
                className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {proofError && <p className="mt-2 text-xs text-red-400">{proofError}</p>}
      </section>
    </>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="mt-6 flex items-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-green-500 text-surface-900'
                    : active
                      ? 'bg-brand-500 text-surface-900'
                      : 'bg-surface-700 text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[0.7rem] ${active ? 'text-white' : 'text-slate-500'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${i < current ? 'bg-green-500/60' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-white/5'}`}>
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
