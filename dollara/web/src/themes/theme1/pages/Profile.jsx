'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function Theme1Profile() {
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
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      {/* ---- Dashboard grid ---- */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* ===== Main column ===== */}
        <div className="space-y-5 lg:col-span-2">
          {/* Wallet balance */}
          <section className="card-glass relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
            <p className="text-sm text-slate-400">Available balance</p>
            <p className="mt-1 text-4xl font-extrabold text-gradient-gold">
              ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
            </p>
            {wallet?.bonus != null && (
              <p className="mt-1 text-xs text-slate-500">
                Bonus: ₹{Number(wallet.bonus).toLocaleString('en-IN')}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/deposit"
                className="rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
              >
                Deposit
              </Link>
              <Link
                href="/withdraw"
                className="rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Withdraw
              </Link>
            </div>
          </section>

          {/* Recent transactions */}
          <section className="card-glass p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent transactions</h2>
              {txs.length > 10 && <span className="text-xs text-slate-500">Showing 10</span>}
            </div>
            <ul className="space-y-2">
              {txs.slice(0, 10).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        isCredit(t.type) ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {isCredit(t.type) ? '↑' : '↓'}
                    </span>
                    <span className="capitalize text-slate-300">{t.type}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={isCredit(t.type) ? 'text-green-400' : 'text-white'}>
                      {isCredit(t.type) ? '+' : '−'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
                    </span>
                    <StatusPill status={t.status} />
                  </div>
                </li>
              ))}
              {txs.length === 0 && (
                <li className="rounded-xl border border-white/5 px-4 py-8 text-center text-sm text-slate-500">
                  No transactions yet
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* ===== Sidebar ===== */}
        <div className="space-y-5">
          {/* Account details */}
          <section className="card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Account details</h2>
            <div className="mt-4 space-y-1">
              <Row label="Full name" value={user?.full_name} />
              <Row label="MemberId" value={user?.username} />
              <Row label="Phone" value={user?.phone} />
              <Row label="KYC status" value={user?.kyc_status} />
              <Row label="Account status" value={user?.account_status} last />
            </div>
          </section>

          {/* Quick links */}
          <section className="card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Quick links</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActionTile href="/deposit" label="Deposit" icon="↑" />
              <ActionTile href="/withdraw" label="Withdraw" icon="↓" />
              <ActionTile href="/bet-history" label="Bet History" icon="🎲" />
              <ActionTile href="/promotions" label="Promos" icon="🎁" />
              <ActionTile href="/refer" label="Refer" icon="👥" />
              <ActionTile href="/support/chat" label="Support" icon="💬" />
            </div>
          </section>

          <Link
            href="/settings"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Settings
          </Link>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-red-500/30 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

function isCredit(type) {
  return ['deposit', 'bonus', 'win', 'refund', 'credit'].includes(String(type).toLowerCase());
}

function Row({ label, value, last }) {
  return (
    <div className={`flex justify-between py-2.5 ${last ? '' : 'border-b border-white/5'}`}>
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-white">{value ?? '—'}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const v = String(status ?? '').toLowerCase();
  const tone = ['completed', 'success', 'confirmed'].includes(v)
    ? 'text-green-400'
    : ['pending', 'processing'].includes(v)
      ? 'text-amber-400'
      : ['failed', 'rejected', 'cancelled'].includes(v)
        ? 'text-red-400'
        : 'text-slate-500';
  return <span className={`text-xs capitalize ${tone}`}>{status}</span>;
}

function ActionTile({ href, label, icon }) {
  return (
    <Link
      href={href}
      className="card-glass flex flex-col items-center gap-2 py-4 text-center transition hover:border-brand-500/40 hover:bg-white/5"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </Link>
  );
}
