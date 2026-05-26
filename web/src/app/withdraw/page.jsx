'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';

export default function WithdrawPage() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/api/v1/wallet').then(setWallet).catch(() => {});
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const pct = (p) =>
    wallet ? setAmount(String(Math.floor(wallet.available * p))) : undefined;

  const submit = async () => {
    setLoading(true);
    try {
      await api('/api/v1/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      alert('Withdrawal request submitted. Processing 2-24 hours.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header wallet={wallet ? { main: wallet.main, bonus: 0, exposure: 0 } : undefined} />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Withdraw</h1>
        {wallet && (
          <p className="mt-2 text-slate-400">
            Available: <span className="text-green-400">₹{wallet.available.toLocaleString('en-IN')}</span>
          </p>
        )}
        <div className="mt-6 card-glass p-6">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-4 text-2xl text-white"
            placeholder="Amount"
          />
          <div className="mt-4 flex gap-2">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pct(p)}
                className="flex-1 rounded-lg bg-surface-700 py-2 text-sm"
              >
                {p === 1 ? 'Max' : `${p * 100}%`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 card-glass p-4 text-sm">
          <h3 className="font-semibold">Verification Checklist</h3>
          <ul className="mt-2 space-y-1 text-slate-400">
            <li className="text-green-400">✓ KYC Verified</li>
            <li className="text-green-400">✓ Bank Account Verified</li>
            <li>⚠ Wagering Requirements (if bonus used)</li>
          </ul>
        </div>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="mt-4 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
          <option value="crypto">Cryptocurrency</option>
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={loading || numAmount < 500}
          className="mt-6 w-full rounded-lg bg-brand-500 py-4 font-semibold text-surface-900 disabled:opacity-50"
        >
          Request Withdrawal
        </button>
      </main>
      <Footer />
    </>
  );
}
