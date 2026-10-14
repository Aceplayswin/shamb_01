'use client';

// Deposit — amount, then one of the admin-configured methods, then the
// destination for that method's TYPE (UPI: QR + ID, bank: account, crypto:
// wallet address) and an optional UTR reference. The deposit stays pending
// until the product admin confirms it.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { affiliateAttribution } from '@/lib/referral';
import { useAuthStore } from '@/store/auth';
import { useDepositMethods } from '@/hooks/useDepositMethods';
import { ReceivingDetails } from '@/components/payments/ReceivingDetails';
import { amountWithinLimits, hasDestination, methodDescription } from '@/lib/paymentDestination';
import { T2Card, t2Input, t2BtnPrimary } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Theme2 (dark / amber) palette for the shared "send payment to" block; the
// card itself is a T2Card wrapped around it.
const RECEIVING_STYLES = {
  card: '',
  title: 'font-bold text-white',
  note: 'mt-1 text-xs text-slate-500',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#070d16] px-4 py-3',
  label: 'text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500',
  value: 'break-all font-medium text-white',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:border-amber-400/40',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-white/10 bg-white object-contain p-1',
  instructions:
    'mt-4 whitespace-pre-line rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100',
};

export default function Theme2Deposit() {
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Deposit</h1>
      {hasPending ? (
        <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}

      <T2Card className="mt-6 p-6">
        <label className="text-sm text-slate-400">Enter Amount (₹)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
          className={`${t2Input} mt-2 text-2xl`} />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button key={a} type="button" onClick={() => setAmount(String(a))}
              className="rounded-lg border border-white/5 bg-[#070d16] px-4 py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400">
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </T2Card>

      <T2Card className="mt-6 p-6">
        <h2 className="font-bold text-white">Payment Method</h2>
        {methodsLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/5 bg-[#070d16] p-4 text-sm text-slate-400">
            {methodsError
              ? 'Payment methods are temporarily unavailable. Please try again shortly.'
              : 'No payment methods are available right now. Please contact support.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {methods.map((pm) => (
              <label key={pm.code}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  method === pm.code ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/5 bg-[#070d16]'
                }`}>
                <input type="radio" name="method" value={pm.code} checked={method === pm.code} onChange={() => setMethod(pm.code)} className="accent-amber-500" />
                <div className="min-w-0">
                  <p className="font-medium text-white">{pm.name}</p>
                  <p className="text-xs text-slate-500">{methodDescription(pm)}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {selected && numAmount > 0 && !limit.ok && (
          <p className="mt-3 text-sm text-amber-400">{limit.message}</p>
        )}
      </T2Card>

      {/* What the player pays into — the block for the selected method's type. */}
      {selected && hasDestination(selected) && (
        <T2Card className="mt-6 p-6">
          <ReceivingDetails method={selected} styles={RECEIVING_STYLES} />
        </T2Card>
      )}

      {selected && (
        <T2Card className="mt-6 p-6">
          <label className="text-sm text-slate-400">
            UTR / reference number <span className="text-slate-600">(optional)</span>
          </label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 412345678901"
            className={`${t2Input} mt-2`} />
          <p className="mt-2 text-xs text-slate-500">
            Pay using {selected.name}, then paste the reference from your payment app so our team can match it.
          </p>
        </T2Card>
      )}

      <button type="button" onClick={submit} disabled={!canSubmit} className={`${t2BtnPrimary} mt-6 w-full`}>
        {hasPending ? 'Deposit Pending Approval' : loading ? 'Processing...' : 'Submit deposit request'}
      </button>
      {result && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-amber-300">Deposit submitted — pending approval</p>
          <p className="mt-1 text-xs text-slate-400">
            Request ID: {result.transactionId}. Your wallet will be credited once our team confirms the payment.
          </p>
        </div>
      )}
    </div>
  );
}
