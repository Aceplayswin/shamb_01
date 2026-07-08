'use client';

// Theme3 Withdraw — shared wallet endpoints, cream style.

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { T3Card, t3Input, t3Select, t3BtnPrimary, T3FormPage } from '../components/ui';

export default function Theme3Withdraw() {
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
      alert('Withdrawal request submitted. Processing 2-24 hours.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <T3FormPage
      title="Withdraw"
      subtitle={
        wallet
          ? `Available: ₹${wallet.available.toLocaleString('en-IN')}`
          : undefined
      }
    >
      <T3Card className="mt-6 p-6">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className={`${t3Input} text-2xl`}
        />
        <div className="mt-4 flex gap-2">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pct(p)}
              className="flex-1 rounded-lg border border-black/10 bg-white py-2 text-sm text-[#4a4458] shadow-sm transition hover:border-[#c79a3b]/50 hover:text-[#9a7a24]"
            >
              {p === 1 ? 'Max' : `${p * 100}%`}
            </button>
          ))}
        </div>
      </T3Card>

      <T3Card className="mt-4 p-4 text-sm">
        <h3 className="font-black text-[#1b1726]">Verification Checklist</h3>
        <ul className="mt-2 space-y-1 text-[#6b6579]">
          <li className="text-[#1c8a52]">✓ KYC Verified</li>
          <li className="text-[#1c8a52]">✓ Bank Account Verified</li>
          <li>⚠ Wagering Requirements (if bonus used)</li>
        </ul>
      </T3Card>

      <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${t3Select} mt-4`}>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
        <option value="crypto">Cryptocurrency</option>
      </select>

      <button type="button" onClick={submit} disabled={loading || numAmount < 500} className={`${t3BtnPrimary} mt-6 w-full`}>
        Request Withdrawal
      </button>
    </T3FormPage>
  );
}
