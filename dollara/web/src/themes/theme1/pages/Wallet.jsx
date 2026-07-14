'use client';

// Theme1 Wallet — glass/dark. Balance breakdown + full transaction history off
// the shared wallet API (/api/v1/wallet, /api/v1/wallet/transactions).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

export default function Theme1Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();
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
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Wallet</h1>

      {/* ---- Balance ---- */}
      <section className="mt-5 card-glass relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-500/10 blur-2xl" />
        <p className="text-sm text-slate-400">Available balance</p>
        <p className="mt-1 text-4xl font-extrabold text-gradient-gold">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
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

      {/* ---- Transactions ---- */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transaction history</h2>
          {txs.length > 0 && <span className="text-xs text-slate-500">{txs.length} shown</span>}
        </div>
        <ul className="space-y-2">
          {txs.map((t) => (
            <li
              key={t.id}
              className="card-glass flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                    isCredit(t.type) ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {isCredit(t.type) ? '↑' : '↓'}
                </span>
                <div>
                  <p className="capitalize text-slate-300">{t.type}</p>
                  <p className="text-xs text-slate-500">{formatDate(t.created_at)}</p>
                </div>
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
            <li className="card-glass px-4 py-8 text-center text-sm text-slate-500">
              No transactions yet
            </li>
          )}
        </ul>
      </section>
    </main>
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

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
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
