'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT' },
];

export default function Theme1Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [result, setResult] = useState(null);

  const numAmount = parseFloat(amount) || 0;
  const bonus = numAmount >= 1000 ? numAmount * 0.5 : 0;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, token, router]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (/log in again|unauthorized/i.test(msg)) {
        router.replace('/login');
        return;
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = async () => {
    if (!result?.transactionId) return;
    setConfirmLoading(true);
    try {
      await api(`/api/v1/wallet/deposit/${result.transactionId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ referenceNumber: `DEV-${Date.now()}` }),
      });
      alert('Deposit confirmed and credited to your wallet.');
      setResult(null);
      setAmount('');
      setMethod('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Confirm failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>

      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Deposit</h1>
        <div className="mt-6 card-glass p-6">
          <label className="text-sm text-slate-400">Enter Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-4 text-2xl text-white"
            placeholder="0"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className="rounded-lg bg-surface-700 px-4 py-2 text-sm hover:bg-brand-500/20"
              >
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          {numAmount > 0 && (
            <div className="mt-4 rounded-lg bg-green-500/10 p-4 text-sm">
              <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
              {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
              <p className="font-semibold text-green-400">
                Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 card-glass p-6">
          <h2 className="font-semibold">Payment Method</h2>
          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                  method === pm.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={pm.id}
                  checked={method === pm.id}
                  onChange={() => setMethod(pm.id)}
                />
                <div>
                  <p className="font-medium">{pm.label}</p>
                  <p className="text-xs text-slate-500">{pm.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={loading || !numAmount || !method}
          className="mt-6 w-full rounded-lg bg-brand-500 py-4 font-semibold text-surface-900 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
        {result && (
          <>
            <p className="mt-4 text-center text-sm text-green-400">
              Deposit initiated. ID: {result.transactionId}
            </p>
            <button
              type="button"
              onClick={confirmDeposit}
              disabled={confirmLoading}
              className="mt-3 w-full rounded-lg border border-brand-500/40 py-3 font-semibold text-brand-400 disabled:opacity-50"
            >
              {confirmLoading ? 'Confirming…' : 'Confirm deposit (dev)'}
            </button>
          </>
        )}
      </main>

    </>
  );
}
