'use client';

// Theme2 Wallet — dark-navy / gold. Balance breakdown off the shared wallet API
// (hydrated into the auth store).

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { T2Card, t2BtnPrimary, t2BtnGhost } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#070d16] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme2Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    refreshSession();
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-black text-white">Wallet</h1>

      <T2Card className="mt-6 p-6">
        <p className="text-sm text-slate-400">Available balance</p>
        <p className="mt-1 bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-4xl font-black text-transparent">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t2BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t2BtnGhost} text-sm`}>Withdraw</Link>
        </div>
      </T2Card>
    </div>
  );
}
