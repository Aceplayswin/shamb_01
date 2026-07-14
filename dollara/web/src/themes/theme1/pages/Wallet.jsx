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
    </main>
  );
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
