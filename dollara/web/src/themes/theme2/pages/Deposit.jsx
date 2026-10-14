'use client';

// Deposit — amount, then Paygate checkout. The wallet is credited when the
// gateway confirms the payment.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';
import { T2Card, t2Input, t2BtnPrimary } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export default function Theme2Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const { pay, paying, error: payError, receipt, reset } = usePaygateDeposit();
  const [amount, setAmount] = useState('');
  const [hasPending, setHasPending] = useState(false);
  const numAmount = parseFloat(amount) || 0;
  const canPay = !paying && !hasPending && numAmount >= MIN_DEPOSIT && !receipt;

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

  const submit = async () => {
    if (!canPay) return;
    try {
      await pay({ amount: numAmount });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) router.replace('/login');
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
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t2Input} mt-2 text-2xl`}
          disabled={Boolean(receipt)}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              disabled={Boolean(receipt)}
              className="rounded-lg border border-white/5 bg-[#070d16] px-4 py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400 disabled:opacity-50"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Minimum deposit ₹{MIN_DEPOSIT}.</p>
      </T2Card>

      {payError && !receipt ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {payError}
        </p>
      ) : null}

      {!receipt ? (
        <button type="button" onClick={submit} disabled={!canPay} className={`${t2BtnPrimary} mt-6 w-full`}>
          {hasPending ? 'Deposit Pending Approval' : paying ? 'Opening payment…' : `Pay ₹${numAmount.toLocaleString('en-IN')}`}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-amber-300">
            {receipt.status === 'success'
              ? 'Deposit successful'
              : receipt.status === 'failed'
                ? 'Payment failed'
                : 'Payment pending'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {receipt.status === 'success'
              ? `₹${Number(receipt.amount).toLocaleString('en-IN')} credited · ID ${receipt.transactionId}`
              : `Request ID: ${receipt.transactionId}`}
          </p>
          <button type="button" onClick={() => { reset(); setAmount(''); }} className={`${t2BtnPrimary} mt-4 w-full`}>
            New deposit
          </button>
        </div>
      )}
    </div>
  );
}
