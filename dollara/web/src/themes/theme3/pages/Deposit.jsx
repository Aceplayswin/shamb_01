'use client';

// Theme3 Deposit — same data flow as theme2 (shared wallet endpoints), cream style.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T3Card, t3Input, t3BtnPrimary, T3FormPage } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT' },
];

export default function Theme3Deposit() {
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
    <T3FormPage title="Deposit">
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
        {numAmount > 0 && (
          <div className="mt-4 rounded-xl border border-[#2fbf71]/25 bg-[#2fbf71]/10 p-4 text-sm text-[#1c8a52]">
            <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
            {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
            <p className="font-black">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
          </div>
        )}
      </T3Card>

      <T3Card className="mt-6 p-6">
        <h2 className="font-black text-[#1b1726]">Payment Method</h2>
        <div className="mt-4 space-y-2">
          {PAYMENT_METHODS.map((pm) => (
            <label
              key={pm.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                method === pm.id ? 'border-[#c79a3b]/60 bg-[#faf6ec]' : 'border-black/10 bg-white'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={pm.id}
                checked={method === pm.id}
                onChange={() => setMethod(pm.id)}
                className="accent-[#c79a3b]"
              />
              <div>
                <p className="font-bold text-[#1b1726]">{pm.label}</p>
                <p className="text-xs text-[#9a94a8]">{pm.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </T3Card>

      <button type="button" onClick={submit} disabled={loading || !numAmount || !method} className={`${t3BtnPrimary} mt-6 w-full`}>
        {loading ? 'Processing...' : 'Proceed to Payment'}
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
