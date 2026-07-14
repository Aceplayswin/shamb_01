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

  const displayName = user?.full_name || user?.username || 'Player';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'P';

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      {/* ---- Identity header (full width) ---- */}
      <section className="ring-grad card-glass overflow-hidden p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-300 to-brand-600 text-2xl font-bold text-surface-900 shadow-lg shadow-brand-500/20">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{displayName}</h1>
              <p className="truncate text-sm text-slate-400">@{user?.username ?? '—'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label="KYC" value={user?.kyc_status} />
                <StatusBadge label="Account" value={user?.account_status} />
              </div>
            </div>
          </div>
          {/* Balance snapshot on the right for wide screens */}
          <div className="flex items-center gap-3 sm:flex-shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-right">
              <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">Balance</p>
              <p className="text-xl font-extrabold text-gradient-gold">
                ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <Link
              href="/deposit"
              className="rounded-2xl bg-brand-500 px-5 py-3.5 text-sm font-semibold text-surface-900 transition hover:bg-brand-400"
            >
              + Deposit
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Dashboard grid ---- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
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
              <Row label="Username" value={user?.username} />
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

function StatusBadge({ label, value }) {
  const v = String(value ?? '').toLowerCase();
  const ok = ['verified', 'active', 'approved'].includes(v);
  const pending = ['pending', 'in_review', 'review'].includes(v);
  const tone = ok
    ? 'bg-green-500/15 text-green-400'
    : pending
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-white/10 text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      <span className="opacity-70">{label}:</span>
      <span className="capitalize">{value ?? '—'}</span>
    </span>
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
