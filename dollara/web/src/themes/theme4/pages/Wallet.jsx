'use client';

// Theme4 Wallet — teal exchange. Balance breakdown + transaction history off the
// shared wallet API.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T4Card, t4BtnPrimary, t4BtnOutline, T4FormPage } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded border border-black/[0.07] bg-[#eef6f7] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-[#8aa0a4]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[#13272b]">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme4Wallet() {
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
    <T4FormPage title="Wallet">
      <T4Card className="mt-6 p-6">
        <p className="text-sm text-[#5d7378]">Available balance</p>
        <p className="mt-1 text-4xl font-black text-[#0e7480]">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t4BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t4BtnOutline} text-sm`}>Withdraw</Link>
        </div>
      </T4Card>

      <h2 className="mb-4 mt-10 text-lg font-black text-[#13272b]">Transaction history</h2>
      <ul className="space-y-2">
        {txs.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded border border-black/[0.07] bg-white px-4 py-3 text-sm shadow-sm">
            <div>
              <span className="capitalize text-[#13272b]">{t.type}</span>
              <span className="ml-2 text-xs text-[#8aa0a4]">{formatDate(t.created_at)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={isCredit(t.type) ? 'font-bold text-emerald-600' : 'font-bold text-[#13272b]'}>
                {isCredit(t.type) ? '+' : '−'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-xs capitalize text-[#8aa0a4]">{t.status}</span>
            </div>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-[#8aa0a4]">No transactions yet</p> : null}
      </ul>
    </T4FormPage>
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
