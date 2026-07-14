'use client';

// Theme2 Wallet — dark-navy / gold. Balance breakdown + transaction history off
// the shared wallet API.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T2Card, t2BtnPrimary, t2BtnGhost } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#070d16] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme2Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    refreshSession();
    api('/api/v1/wallet/transactions').then(setTxs).catch(() => setTxs([]));
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Wallet</h1>

      <T2Card className="mt-6 p-6">
        <p className="text-sm text-slate-400">Available balance</p>
        <p className="mt-1 bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-4xl font-black text-transparent">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t2BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t2BtnGhost} text-sm`}>Withdraw</Link>
        </div>
      </T2Card>

      <h2 className="mb-4 mt-10 text-lg font-bold text-white">Transaction history</h2>
      <ul className="space-y-2">
        {txs.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0d1420] px-4 py-3 text-sm">
            <div>
              <span className="capitalize text-slate-200">{t.type}</span>
              <span className="ml-2 text-xs text-slate-500">{formatDate(t.created_at)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={isCredit(t.type) ? 'text-emerald-400' : 'text-white'}>
                {isCredit(t.type) ? '+' : '−'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-xs capitalize text-slate-500">{t.status}</span>
            </div>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-slate-500">No transactions yet</p> : null}
      </ul>
    </div>
  );
}

function isCredit(type) {
  return ['deposit', 'bonus', 'win', 'refund', 'credit'].includes(String(type).toLowerCase());
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
