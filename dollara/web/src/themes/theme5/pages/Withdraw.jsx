'use client';

// Theme5 Withdraw — shared wallet endpoints, light portal style.

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { T5Card, t5Input, t5Select, t5BtnPrimary, T5FormPage } from '../components/ui';

export default function Theme5Withdraw() {
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
      await api('/api/v1/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      alert('Withdrawal request submitted — pending approval. The amount is held until our team approves or rejects it.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <T5FormPage
      title="Withdraw"
      subtitle={wallet ? `Available: ₹${wallet.available.toLocaleString('en-IN')}` : undefined}
    >
      <T5Card className="mt-4 p-6">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className={`${t5Input} text-2xl`}
        />
        <div className="mt-4 flex gap-2">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pct(p)}
              className="flex-1 rounded-lg border border-black/10 bg-white py-2 text-sm font-bold text-[#0f1b33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              {p === 1 ? 'Max' : `${p * 100}%`}
            </button>
          ))}
        </div>
      </T5Card>

      <T5Card className="mt-4 p-4 text-sm">
        <h3 className="font-black text-[#0f1b33]">Verification Checklist</h3>
        <ul className="mt-2 space-y-1 text-[#64748b]">
          <li className="text-[#15803d]">✓ KYC Verified</li>
          <li className="text-[#15803d]">✓ Bank Account Verified</li>
          <li>⚠ Wagering Requirements (if bonus used)</li>
        </ul>
      </T5Card>

      <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${t5Select} mt-4`}>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
        <option value="crypto">Cryptocurrency</option>
      </select>

      <button
        type="button"
        onClick={submit}
        disabled={loading || numAmount < 500}
        className={`${t5BtnPrimary} mt-4 w-full`}
      >
        Request Withdrawal
      </button>
    </T5FormPage>
  );
}
