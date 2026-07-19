'use client';

// Theme5 Deposit — same data flow as theme2/3/4 (shared wallet endpoints), light
// portal style.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T5Card, t5Input, t5BtnPrimary, T5FormPage } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT' },
];

export default function Theme5Deposit() {
  const router = useRouter();
  const { token, isHydrated, hydrate } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <T5FormPage title="Deposit">
      <T5Card className="mt-4 p-6">
        <label className="text-sm text-[#64748b]">Enter Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className={`${t5Input} mt-2 text-2xl`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#0f1b33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        {numAmount > 0 && (
          <div className="mt-4 rounded-lg border border-[#22a34a]/25 bg-[#22a34a]/10 p-4 text-sm text-[#15803d]">
            <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
            {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
            <p className="font-black">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
          </div>
        )}
      </T5Card>

      <T5Card className="mt-4 p-6">
        <h2 className="font-black text-[#0f1b33]">Payment Method</h2>
        <div className="mt-4 space-y-2">
          {PAYMENT_METHODS.map((pm) => (
            <label
              key={pm.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                method === pm.id ? 'border-[#1d4ed8] bg-[#eff4ff]' : 'border-black/10 bg-white'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={pm.id}
                checked={method === pm.id}
                onChange={() => setMethod(pm.id)}
                className="accent-[#1d4ed8]"
              />
              <div>
                <p className="font-bold text-[#0f1b33]">{pm.label}</p>
                <p className="text-xs text-[#94a3b8]">{pm.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </T5Card>

      <button
        type="button"
        onClick={submit}
        disabled={loading || !numAmount || !method}
        className={`${t5BtnPrimary} mt-4 w-full`}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
      {result && (
        <div className="mt-4 rounded-lg border border-[#1d4ed8]/25 bg-[#eff4ff] p-4 text-center">
          <p className="text-sm font-black text-[#1d4ed8]">Deposit submitted — pending approval</p>
          <p className="mt-1 text-xs text-[#64748b]">
            Request ID: {result.transactionId}. Your wallet will be credited once our team confirms the payment.
          </p>
        </div>
      )}
    </T5FormPage>
  );
}
