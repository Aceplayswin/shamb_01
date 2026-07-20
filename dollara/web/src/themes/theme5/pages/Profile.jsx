'use client';

// Theme5 Profile — shared auth store + wallet transactions, light portal style.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T5Card, t5BtnPrimary, t5BtnOutline, T5FormPage } from '../components/ui';

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-black/[0.06] py-2 last:border-b-0">
      <span className="text-[#64748b]">{label}</span>
      <span className="font-bold text-[#0f1b33]">{value ?? '—'}</span>
    </div>
  );
}

export default function Theme5Profile() {
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
    <T5FormPage title="Profile">
      <T5Card className="mt-4 space-y-1 p-6">
        <Row label="Name" value={user?.full_name} />
        <Row label="MemberId" value={user?.username} />
        <Row label="Phone" value={user?.phone} />
        <Row label="KYC" value={user?.kyc_status} />
        <Row label="Account" value={user?.account_status} />
      </T5Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/deposit" className={`${t5BtnPrimary} text-sm`}>Deposit</Link>
        <Link href="/withdraw" className={`${t5BtnOutline} text-sm`}>Withdraw</Link>
        <Link href="/support/chat" className={`${t5BtnOutline} text-sm`}>Support</Link>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-black text-[#0f1b33]">Recent transactions</h2>
      <ul className="space-y-2">
        {txs.slice(0, 10).map((t) => (
          <li
            key={t.id}
            className="flex justify-between rounded-lg border border-black/[0.06] bg-white px-4 py-3 text-sm shadow-sm"
          >
            <span className="capitalize text-[#0f1b33]">{t.type}</span>
            <span className="font-black text-[#0f1b33]">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
            <span className="text-[#94a3b8]">{t.status}</span>
          </li>
        ))}
        {txs.length === 0 ? <p className="text-[#94a3b8]">No transactions yet</p> : null}
      </ul>

      <button type="button" onClick={logout} className="mt-8 text-sm font-bold text-[#f4547a] hover:underline">
        Logout
      </button>
    </T5FormPage>
  );
}
