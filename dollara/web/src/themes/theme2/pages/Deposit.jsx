'use client';

import { useState } from 'react';
import { api } from '@/services/api';
import { T2Card, t2Input, t2BtnPrimary } from '../components/ui';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (Instant)', desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer' },
  { id: 'bank_transfer', label: 'Bank Transfer', desc: '5-30 min verification' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'BTC, ETH, USDT' },
];

export default function Theme2Deposit() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [result, setResult] = useState(null);

  const numAmount = parseFloat(amount) || 0;
  const bonus = numAmount >= 1000 ? numAmount * 0.5 : 0;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api('/api/v1/wallet/deposit', { method: 'POST', body: JSON.stringify({ amount: numAmount, paymentMethod: method }) });
      setResult(res);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Deposit failed');
    } finally { setLoading(false); }
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Deposit</h1>

      <T2Card className="mt-6 p-6">
        <label className="text-sm text-slate-400">Enter Amount (₹)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
          className={`${t2Input} mt-2 text-2xl`} />
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button key={a} type="button" onClick={() => setAmount(String(a))}
              className="rounded-lg border border-white/5 bg-[#070d16] px-4 py-2 text-sm text-slate-200 hover:border-amber-400/40 hover:text-amber-400">
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        {numAmount > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <p>You deposit: ₹{numAmount.toLocaleString('en-IN')}</p>
            {bonus > 0 && <p>You get bonus: ₹{bonus.toLocaleString('en-IN')}</p>}
            <p className="font-semibold text-emerald-400">Total playable: ₹{(numAmount + bonus).toLocaleString('en-IN')}</p>
          </div>
        )}
      </T2Card>

      <T2Card className="mt-6 p-6">
        <h2 className="font-bold text-white">Payment Method</h2>
        <div className="mt-4 space-y-2">
          {PAYMENT_METHODS.map((pm) => (
            <label key={pm.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                method === pm.id ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/5 bg-[#070d16]'
              }`}>
              <input type="radio" name="method" value={pm.id} checked={method === pm.id} onChange={() => setMethod(pm.id)} className="accent-amber-500" />
              <div>
                <p className="font-medium text-white">{pm.label}</p>
                <p className="text-xs text-slate-500">{pm.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </T2Card>

      <button type="button" onClick={submit} disabled={loading || !numAmount || !method} className={`${t2BtnPrimary} mt-6 w-full`}>
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
      {result && (
        <>
          <p className="mt-4 text-center text-sm text-emerald-400">Deposit initiated. ID: {result.transactionId}</p>
          <button type="button" onClick={confirmDeposit} disabled={confirmLoading}
            className="mt-3 w-full rounded-xl border border-amber-400/40 py-3 font-semibold text-amber-400 disabled:opacity-50">
            {confirmLoading ? 'Confirming…' : 'Confirm deposit (dev)'}
          </button>
        </>
      )}
    </div>
  );
}
