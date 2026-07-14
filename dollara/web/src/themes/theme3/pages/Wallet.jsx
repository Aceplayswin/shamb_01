'use client';

// Theme3 Wallet — light cream / gold. Balance breakdown off the shared wallet
// API (hydrated into the auth store).

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { T3Card, t3BtnPrimary, t3BtnOutline, T3FormPage } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#faf6ec] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-[#9a94a8]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-[#1b1726]">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme3Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    refreshSession();
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <T3FormPage title="Wallet">
      <T3Card className="mt-6 p-6">
        <p className="text-sm text-[#6b6579]">Available balance</p>
        <p className="mt-1 bg-gradient-to-br from-[#c79a3b] to-[#b8862f] bg-clip-text text-4xl font-black text-transparent">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t3BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t3BtnOutline} text-sm`}>Withdraw</Link>
        </div>
      </T3Card>
    </T3FormPage>
  );
}
