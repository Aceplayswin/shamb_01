'use client';

// Theme4 Profile — shared auth store + wallet transactions, teal style.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T4Card, t4BtnPrimary, t4BtnOutline, T4FormPage } from '../components/ui';

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-black/[0.06] py-2">
      <span className="text-[#5d7378]">{label}</span>
      <span className="font-bold text-[#13272b]">{value ?? '—'}</span>
    </div>
  );
}

export default function Theme4Profile() {
  const router = useRouter();
  const { token, user, logout, refreshSession } = useAuthStore();
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refreshSession();
    api('/api/v1/wallet/transactions').then(setTxs).catch(() => setTxs([]));
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <T4FormPage title="Profile">
      <T4Card className="mt-6 space-y-3 p-6">
        <Row label="Name" value={user?.full_name} />
        <Row label="MemberId" value={user?.username} />
        <Row label="Phone" value={user?.phone} />
        <Row label="KYC" value={user?.kyc_status} />
        <Row label="Account" value={user?.account_status} />
      </T4Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/deposit" className={`${t4BtnPrimary} text-sm`}>Deposit</Link>
        <Link href="/withdraw" className={`${t4BtnOutline} text-sm`}>Withdraw</Link>
        <Link href="/support/chat" className={`${t4BtnOutline} text-sm`}>Support</Link>
      </div>

      <h2 className="mb-4 mt-10 text-lg font-black text-[#13272b]">Recent transactions</h2>
      <ul className="space-y-2">
        {txs.slice(0, 10).map((t) => (
          <li key={t.id} className="flex justify-between rounded border border-black/[0.07] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="capitalize text-[#13272b]">{t.type}</span>
            <span className="font-bold text-[#13272b]">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
            <span className="text-[#8aa0a4]">{t.status}</span>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-[#8aa0a4]">No transactions yet</p> : null}
      </ul>

      <button type="button" onClick={logout} className="mt-8 text-sm text-[#e5342c] hover:underline">
        Logout
      </button>
    </T4FormPage>
  );
}
