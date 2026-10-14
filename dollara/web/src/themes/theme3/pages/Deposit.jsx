'use client';

// Theme3 Deposit — same data flow as theme2 (shared wallet endpoints), cream
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
import { T3Card, t3Input, t3BtnPrimary, T3FormPage } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Theme3 (cream / gold) palette for the shared "send payment to" block.
const RECEIVING_STYLES = {
  card: '',
  title: 'font-black text-[#1b1726]',
  note: 'mt-1 text-xs text-[#9a94a8]',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3',
  label: 'text-[0.65rem] font-black uppercase tracking-wide text-[#9a94a8]',
  value: 'break-all font-bold text-[#1b1726]',
  mono: 'font-mono text-sm',
  copyBtn:
    'shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-[#9a7a24] transition hover:border-[#c79a3b]/50 hover:bg-[#faf6ec]',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-xl border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-xl bg-[#faf6ec] p-3 text-xs text-[#4a4458]',
};

export default function Theme3Deposit() {
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
    <T3FormPage title="Deposit">
      {hasPending ? (
        <p className="mt-4 rounded-xl border border-[#c79a3b]/30 bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#9a7a24]">
          You have a deposit request awaiting approval. You can place a new
          request once it has been approved or rejected.
        </p>
      ) : null}
      <T3Card className="mt-6 p-6">
        <label className="text-sm text-[#6b6579]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t3Input} mt-2 text-2xl`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm text-[#4a4458] shadow-sm transition hover:border-[#c79a3b]/50 hover:text-[#9a7a24]"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </T3Card>

      <T3Card className="mt-6 p-6">
        <h2 className="font-black text-[#1b1726]">Payment Method</h2>
        {methodsLoading ? (
          <p className="mt-4 text-sm text-[#9a94a8]">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="mt-4 rounded-xl border border-black/10 bg-white p-4 text-sm text-[#6b6579]">
            {methodsError
              ? 'Payment methods are temporarily unavailable. Please try again shortly.'
              : 'No payment methods are available right now. Please contact support.'}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {methods.map((pm) => (
              <label
                key={pm.code}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  method === pm.code ? 'border-[#c79a3b]/60 bg-[#faf6ec]' : 'border-black/10 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={pm.code}
                  checked={method === pm.code}
                  onChange={() => setMethod(pm.code)}
                  className="accent-[#c79a3b]"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[#1b1726]">{pm.name}</p>
                  <p className="text-xs text-[#9a94a8]">{methodDescription(pm)}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {selected && numAmount > 0 && !limit.ok && (
          <p className="mt-3 text-sm font-bold text-[#b45309]">{limit.message}</p>
        )}
      </T3Card>

      {/* What the player pays into — the block for the selected method's type. */}
      {selected && hasDestination(selected) && (
        <T3Card className="mt-6 p-6">
          <ReceivingDetails method={selected} styles={RECEIVING_STYLES} />
        </T3Card>
      )}

      {selected && (
        <T3Card className="mt-6 p-6">
          <label className="text-sm text-[#6b6579]">
            UTR / reference number <span className="text-[#9a94a8]">(optional)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 412345678901"
            className={`${t3Input} mt-2`}
          />
          <p className="mt-2 text-xs text-[#9a94a8]">
            Pay using {selected.name}, then paste the reference from your payment app so our team can match it.
          </p>
        </T3Card>
      )}

      <button type="button" onClick={submit} disabled={!canSubmit} className={`${t3BtnPrimary} mt-6 w-full`}>
        {hasPending ? 'Deposit Pending Approval' : loading ? 'Processing...' : 'Submit deposit request'}
      </button>
      {result && (
        <div className="mt-4 rounded-xl border border-[#c79a3b]/30 bg-[#faf6ec] p-4 text-center">
          <p className="text-sm font-black text-[#9a7a24]">Deposit submitted — pending approval</p>
          <p className="mt-1 text-xs text-[#6b6579]">
            Request ID: {result.transactionId}. Your wallet will be credited once our team confirms the payment.
          </p>
        </div>
      )}
    </T3FormPage>
  );
}
