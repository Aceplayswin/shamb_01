'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T2Card, t2BtnPrimary, t2BtnGhost } from '../components/ui';

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value ?? '—'}</span>
    </div>
  );
}

export default function Theme2Profile() {
  const router = useRouter();
  const { token, user, logout, refreshSession } = useAuthStore();
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    refreshSession();
    api('/api/v1/wallet/transactions').then(setTxs).catch(() => setTxs([]));
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Profile</h1>

      <T2Card className="mt-6 space-y-3 p-6">
        <Row label="Name" value={user?.full_name} />
        <Row label="MemberId" value={user?.username} />
        <Row label="Phone" value={user?.phone} />
        <Row label="KYC" value={user?.kyc_status} />
        <Row label="Account" value={user?.account_status} />
      </T2Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/deposit" className={`${t2BtnPrimary} text-sm`}>Deposit</Link>
        <Link href="/withdraw" className={`${t2BtnGhost} text-sm`}>Withdraw</Link>
        <Link href="/support/chat" className={`${t2BtnGhost} text-sm`}>Support</Link>
      </div>

      <h2 className="mb-4 mt-10 text-lg font-bold text-white">Recent transactions</h2>
      <ul className="space-y-2">
        {txs.slice(0, 10).map((t) => (
          <li key={t.id} className="flex justify-between rounded-xl border border-white/5 bg-[#0d1420] px-4 py-3 text-sm">
            <span className="capitalize text-slate-300">{t.type}</span>
            <span className="text-white">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
            <span className="text-slate-500">{t.status}</span>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-slate-500">No transactions yet</p> : null}
      </ul>

      <button type="button" onClick={logout} className="mt-8 text-sm text-red-400 hover:underline">Logout</button>
    </div>
  );
}
