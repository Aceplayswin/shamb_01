'use client';

// Theme3 Profile — shared auth store + wallet transactions, cream style.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T3Card, t3BtnPrimary, t3BtnOutline, T3FormPage } from '../components/ui';

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-black/[0.06] py-2">
      <span className="text-[#6b6579]">{label}</span>
      <span className="font-bold text-[#1b1726]">{value ?? '—'}</span>
    </div>
  );
}

export default function Theme3Profile() {
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
    <T3FormPage title="Profile">
      <T3Card className="mt-6 space-y-3 p-6">
        <Row label="Name" value={user?.full_name} />
        <Row label="Username" value={user?.username} />
        <Row label="Phone" value={user?.phone} />
        <Row label="KYC" value={user?.kyc_status} />
        <Row label="Account" value={user?.account_status} />
      </T3Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/deposit" className={`${t3BtnPrimary} text-sm`}>Deposit</Link>
        <Link href="/withdraw" className={`${t3BtnOutline} text-sm`}>Withdraw</Link>
        <Link href="/support/chat" className={`${t3BtnOutline} text-sm`}>Support</Link>
      </div>

      <h2 className="mb-4 mt-10 text-lg font-black text-[#1b1726]">Recent transactions</h2>
      <ul className="space-y-2">
        {txs.slice(0, 10).map((t) => (
          <li key={t.id} className="flex justify-between rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm shadow-sm">
            <span className="capitalize text-[#4a4458]">{t.type}</span>
            <span className="font-bold text-[#1b1726]">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
            <span className="text-[#9a94a8]">{t.status}</span>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-[#9a94a8]">No transactions yet</p> : null}
      </ul>

      <button type="button" onClick={logout} className="mt-8 text-sm text-[#e5484d] hover:underline">
        Logout
      </button>
    </T3FormPage>
  );
}
