'use client';

// Theme4 Deposit — amount, then Paygate checkout. Payment success queues for
// admin approval; the wallet is credited only when an admin approves.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { usePaygateDeposit } from '@/hooks/usePaygateDeposit';
import { T4Card, t4Input, t4BtnPrimary, T4FormPage } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export default function Theme4Deposit() {
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
          disabled={Boolean(receipt)}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              disabled={Boolean(receipt)}
              className="rounded border border-[#0e7480]/25 bg-white px-4 py-2 text-sm text-[#13272b] shadow-sm transition hover:border-[#0e7480] hover:text-[#0e7480] disabled:opacity-50"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#8aa0a4]">Minimum deposit ₹{MIN_DEPOSIT}.</p>
      </T4Card>

      {payError && !receipt ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</p>
      ) : null}

      {!receipt ? (
        <button type="button" onClick={submit} disabled={!canPay} className={`${t4BtnPrimary} mt-6 w-full`}>
          {hasPending ? 'Deposit Pending Approval' : paying ? 'Opening payment…' : `Pay ₹${numAmount.toLocaleString('en-IN')}`}
        </button>
      ) : (
        <div className="mt-4 rounded border border-[#0e7480]/30 bg-[#eefafa] p-4 text-center">
          <p className="text-sm font-black text-[#0e7480]">
            {receipt.status === 'success'
              ? 'Deposit successful'
              : receipt.status === 'failed'
                ? 'Payment failed'
                : receipt.status === 'awaiting_approval'
                  ? 'Payment received'
                  : 'Payment pending'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {receipt.status === 'success'
              ? `₹${Number(receipt.amount).toLocaleString('en-IN')} credited · ID ${receipt.transactionId}`
              : receipt.status === 'awaiting_approval'
                ? `₹${Number(receipt.amount).toLocaleString('en-IN')} awaiting admin approval · ID ${receipt.transactionId}`
                : `Request ID: ${receipt.transactionId}`}
          </p>
          <button type="button" onClick={() => { reset(); setAmount(''); }} className={`${t4BtnPrimary} mt-4 w-full`}>
            New deposit
          </button>
        </div>
      )}
    </T4FormPage>
  );
}
