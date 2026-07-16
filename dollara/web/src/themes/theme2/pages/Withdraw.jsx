'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { T2Card, t2Input, t2Select, t2BtnPrimary } from '../components/ui';

export default function Theme2Withdraw() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/api/v1/wallet').then(setWallet).catch(() => {});
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const pct = (p) => (wallet ? setAmount(String(Math.floor(wallet.available * p))) : undefined);

  const submit = async () => {
    setLoading(true);
    try {
      await api('/api/v1/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount: numAmount, paymentMethod: method }) });
      alert('Withdrawal request submitted — pending approval. The amount is held until our team approves or rejects it.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Withdraw</h1>
      {wallet && (
        <p className="mt-2 text-slate-400">
          Available: <span className="text-emerald-400">₹{wallet.available.toLocaleString('en-IN')}</span>
        </p>
      )}

      <T2Card className="mt-6 p-6">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className={`${t2Input} text-2xl`} />
        <div className="mt-4 flex gap-2">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button key={p} type="button" onClick={() => pct(p)}
              className="flex-1 rounded-lg border border-white/5 bg-[#070d16] py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400">
              {p === 1 ? 'Max' : `${p * 100}%`}
            </button>
          ))}
        </div>
      </T2Card>

      <T2Card className="mt-4 p-4 text-sm">
        <h3 className="font-bold text-white">Verification Checklist</h3>
        <ul className="mt-2 space-y-1 text-slate-400">
          <li className="text-emerald-400">✓ KYC Verified</li>
          <li className="text-emerald-400">✓ Bank Account Verified</li>
          <li>⚠ Wagering Requirements (if bonus used)</li>
        </ul>
      </T2Card>

      <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${t2Select} mt-4`}>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
        <option value="crypto">Cryptocurrency</option>
      </select>

      <button type="button" onClick={submit} disabled={loading || numAmount < 500} className={`${t2BtnPrimary} mt-6 w-full`}>
        Request Withdrawal
      </button>
    </div>
  );
}
