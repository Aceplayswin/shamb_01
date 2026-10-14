'use client';

// Theme4 Deposit — same data flow as theme2/3 (shared wallet endpoints), teal
// style. Methods come from the admin console; the block under the chosen one
// is decided by its TYPE (UPI: QR + ID, bank: account, crypto: wallet address).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { useAuthStore } from '@/store/auth';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';
import { T4Card, t4Input, t4BtnPrimary, T4FormPage } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Theme4 (teal) palette for the shared "send payment to" block.
const RECEIVING_STYLES = {
  card: '',
  title: 'font-black text-[#13272b]',
  note: 'mt-1 text-xs text-[#8aa0a4]',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded border border-black/10 bg-white px-4 py-3',
  label: 'text-[0.65rem] font-black uppercase tracking-wide text-[#8aa0a4]',
  value: 'break-all font-bold text-[#13272b]',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded border border-[#0e7480]/25 px-3 py-1.5 text-xs font-bold text-[#0e7480] transition hover:border-[#0e7480] hover:bg-[#eef6f7]',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded bg-[#eef6f7] p-3 text-xs text-[#13272b]',
};

export default function Theme4Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  // One request at a time, same as withdrawals: the form stays locked until
  // the open deposit is approved or rejected.
  const [hasPending, setHasPending] = useState(false);
  const {
    methods,
    loading: methodsLoading,
    error: methodsError,
  } = useDepositMethods(isHydrated && Boolean(token));

  const numAmount = parseFloat(amount) || 0;
  const selected = methods.find((m) => m.code === method) ?? null;
  const limit = amountWithinLimits(selected, numAmount);
  const canSubmit = !loading && !hasPending && numAmount > 0 && Boolean(selected) && limit.ok;

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

  // A method the admin has since disabled must not stay selected.
  useEffect(() => {
    if (method && !methods.some((m) => m.code === method)) setMethod('');
  }, [methods, method]);

  const submit = async () => {
    if (!selected || hasPending) return;
    setLoading(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: selected.code,
          referenceNumber: reference.trim() || null,
          ...affiliateAttribution(),
        }),
      });
      setResult(res);
      setHasPending(true);
      setReference('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      alert(msg);
    } finally {
      setLoading(false);
      loadPending();
    }
  };

  return (
    <T4FormPage title="Deposit">
      {hasPending ? (
        <p className="mt-4 rounded border border-[#0e7480]/30 bg-[#eefafa] px-3 py-2 text-xs font-bold text-[#0e7480]">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}
      <T4Card className="mt-6 p-6">
        <label className="text-sm text-[#5d7378]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t4Input} mt-2 text-2xl`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className="rounded border border-[#0e7480]/25 bg-white px-4 py-2 text-sm text-[#13272b] shadow-sm transition hover:border-[#0e7480] hover:text-[#0e7480]"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </T4Card>

      <T4Card className="mt-6 p-6">
        <h2 className="font-black text-[#13272b]">Payment Method</h2>
        {methodsLoading ? (
          <p className="mt-4 text-sm text-[#8aa0a4]">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="mt-4 rounded border border-black/10 bg-white p-4 text-sm text-[#5d7378]">
            {methodsError
              ? 'Payment methods are temporarily unavailable. Please try again shortly.'
              : 'No payment methods are available right now. Please contact support.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {methods.map((pm) => (
              <label
                key={pm.code}
                className={`flex cursor-pointer items-center gap-3 rounded border p-4 transition ${
                  method === pm.code ? 'border-[#0e7480] bg-[#eef6f7]' : 'border-black/10 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={pm.code}
                  checked={method === pm.code}
                  onChange={() => setMethod(pm.code)}
                  className="accent-[#0e7480]"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#13272b]">{pm.name}</p>
                  <p className="text-xs text-[#8aa0a4]">{methodDescription(pm)}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {selected && numAmount > 0 && !limit.ok && (
          <p className="mt-3 text-sm font-bold text-[#b45309]">{limit.message}</p>
        )}
      </T4Card>

      {/* What the player pays into — the block for the selected method's type. */}
      {selected && hasDestination(selected) && (
        <T4Card className="mt-6 p-6">
          <ReceivingDetails method={selected} styles={RECEIVING_STYLES} />
        </T4Card>
      )}

      {selected && (
        <T4Card className="mt-6 p-6">
          <label className="text-sm text-[#5d7378]">
            UTR / reference number <span className="text-[#8aa0a4]">(optional)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 412345678901"
            className={`${t4Input} mt-2`}
          />
          <p className="mt-2 text-xs text-[#8aa0a4]">
            Pay using {selected.name}, then paste the reference from your payment app so our team can match it.
          </p>
        </T4Card>
      )}

      <button type="button" onClick={submit} disabled={!canSubmit} className={`${t4BtnPrimary} mt-6 w-full`}>
        {hasPending ? 'Deposit Pending Approval' : loading ? 'Processing...' : 'Submit deposit request'}
      </button>
      {result && (
        <div className="mt-4 rounded border border-[#0e7480]/30 bg-[#eefafa] p-4 text-center">
          <p className="text-sm font-black text-[#0e7480]">Deposit submitted — pending approval</p>
          <p className="mt-1 text-xs text-slate-500">
            Request ID: {result.transactionId}. Your wallet will be credited once our team confirms the payment.
          </p>
        </div>
      )}
    </T4FormPage>
  );
}
