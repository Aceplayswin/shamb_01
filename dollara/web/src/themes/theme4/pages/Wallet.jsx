'use client';

// Theme4 Wallet — teal exchange. Balance breakdown off the shared wallet API
// (hydrated into the auth store).

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { T4Card, t4BtnPrimary, t4BtnOutline, T4FormPage } from '../components/ui';

function Stat({ label, value }) {
  return (
    <div className="rounded border border-black/[0.07] bg-[#eef6f7] px-3 py-2.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-[#8aa0a4]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[#13272b]">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export default function Theme4Wallet() {
  const router = useRouter();
  const { token, wallet, refreshSession } = useAuthStore();

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    refreshSession();
  }, [token, router, refreshSession]);

  if (!token) return null;

  return (
    <T4FormPage title="Wallet">
      <T4Card className="mt-6 p-6">
        <p className="text-sm text-[#5d7378]">Available balance</p>
        <p className="mt-1 text-4xl font-black text-[#0e7480]">
          ₹{(wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t4BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t4BtnOutline} text-sm`}>Withdraw</Link>
        </div>
      </T4Card>
    </T4FormPage>
  );
}
