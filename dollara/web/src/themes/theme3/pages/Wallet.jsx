'use client';

// Theme3 Wallet — light cream / gold. Balance breakdown + transaction history
// off the shared wallet API.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T3Card, t3BtnPrimary, t3BtnOutline, T3FormPage } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#faf6ec] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-[#9a94a8]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-[#1b1726]">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme3Wallet() {
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
    <T3FormPage title="Wallet">
      <T3Card className="mt-6 p-6">
        <p className="text-sm text-[#6b6579]">Available balance</p>
        <p className="mt-1 bg-gradient-to-br from-[#c79a3b] to-[#b8862f] bg-clip-text text-4xl font-black text-transparent">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t3BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t3BtnOutline} text-sm`}>Withdraw</Link>
        </div>
      </T3Card>

      <h2 className="mb-4 mt-10 text-lg font-black text-[#1b1726]">Transaction history</h2>
      <ul className="space-y-2">
        {txs.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm shadow-sm">
            <div>
              <span className="capitalize text-[#4a4458]">{t.type}</span>
              <span className="ml-2 text-xs text-[#9a94a8]">{formatDate(t.created_at)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={isCredit(t.type) ? 'font-bold text-emerald-600' : 'font-bold text-[#1b1726]'}>
                {isCredit(t.type) ? '+' : '−'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-xs capitalize text-[#9a94a8]">{t.status}</span>
            </div>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-[#9a94a8]">No transactions yet</p> : null}
      </ul>
    </T3FormPage>
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
