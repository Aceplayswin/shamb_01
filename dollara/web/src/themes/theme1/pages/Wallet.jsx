'use client';

// Theme1 Wallet — glass/dark. Balance breakdown off the shared wallet API
// (/api/v1/wallet, hydrated into the auth store).

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Theme1Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refreshSession();
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Wallet</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* ===== Main column ===== */}
        <div className="space-y-5 lg:col-span-2">
          {/* Balance hero */}
          <section className="card-glass relative overflow-hidden p-8">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl" />
            <p className="text-sm text-slate-400">Available balance</p>
            <p className="mt-1 text-5xl font-extrabold text-gradient-gold">
              ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
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

          {/* Balance breakdown */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Bonus" value={wallet?.bonus} />
            <Stat label="Locked" value={wallet?.locked} />
            <Stat label="Exposure" value={wallet?.exposure} />
          </section>
        </div>

        {/* ===== Sidebar ===== */}
        <div className="space-y-5">
          <section className="card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Quick links</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActionTile href="/deposit" label="Deposit" icon="↑" />
              <ActionTile href="/withdraw" label="Withdraw" icon="↓" />
              <ActionTile href="/bet-history" label="Bet History" icon="🎲" />
              <ActionTile href="/promotions" label="Promos" icon="🎁" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card-glass p-5">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

function ActionTile({ href, label, icon }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] py-4 text-center transition hover:border-brand-500/40 hover:bg-white/5"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </Link>
  );
}
