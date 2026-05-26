'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, wallet, logout, refreshSession } = useAuthStore();
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refreshSession();
    api('/api/v1/wallet/transactions')
      .then(setTxs)
      .catch(() => setTxs([]));
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <>
      <Header wallet={wallet ?? undefined} userName={user?.full_name ?? user?.username} />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="mt-6 card-glass space-y-3 p-6">
          <Row label="Name" value={user?.full_name} />
          <Row label="Username" value={user?.username} />
          <Row label="Phone" value={user?.phone} />
          <Row label="KYC" value={user?.kyc_status} />
          <Row label="Account" value={user?.account_status} />
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/deposit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-surface-900">
            Deposit
          </Link>
          <Link href="/withdraw" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">
            Withdraw
          </Link>
          <Link href="/support/chat" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white">
            Support
          </Link>
        </div>

        <h2 className="mb-4 mt-10 text-lg font-semibold">Recent transactions</h2>
        <ul className="space-y-2">
          {txs.slice(0, 10).map((t) => (
            <li key={t.id} className="card-glass flex justify-between px-4 py-3 text-sm">
              <span className="capitalize text-slate-300">{t.type}</span>
              <span className="text-white">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
              <span className="text-slate-500">{t.status}</span>
            </li>
          ))}
          {txs.length === 0 ? <p className="text-slate-500">No transactions yet</p> : null}
        </ul>

        <button
          type="button"
          onClick={logout}
          className="mt-8 text-sm text-red-400 hover:underline"
        >
          Logout
        </button>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value ?? '—'}</span>
    </div>
  );
}
