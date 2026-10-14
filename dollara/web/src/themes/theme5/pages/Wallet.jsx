'use client';

// Theme5 Wallet — balance breakdown off the shared wallet API (hydrated into the
// auth store), light portal style.

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { T5Card, t5BtnPrimary, t5BtnOutline, T5FormPage } from '../components/ui';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-black/[0.07] bg-[#f6f8fa] px-3 py-2.5">
      <p className="text-[0.6rem] font-black uppercase tracking-wide text-[#94a3b8]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-[#0f1b33]">
        ₹{Number(value ?? 0).toLocaleString('en-IN')}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.6rem] font-semibold leading-tight text-[#94a3b8]">{hint}</p>
      ) : null}
    </div>
  );
}

export default function Theme5Wallet() {
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
    <T5FormPage title="Wallet">
      <T5Card className="mt-4 p-6">
        <p className="text-sm text-[#64748b]">Withdrawable balance</p>
        <p className="mt-1 font-display text-4xl font-black text-[#1d4ed8]">
          ₹{(wallet?.withdrawable ?? wallet?.available ?? 0).toLocaleString('en-IN')}
        </p>
        {wallet?.bonus > 0 ? (
          <p className="mt-1 text-xs font-semibold text-[#64748b]">
            + ₹{Number(wallet.bonus).toLocaleString('en-IN')} bonus you can play with
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Bonus" value={wallet?.bonus} hint="Not withdrawable" />
          <Stat label="Locked" value={wallet?.locked} />
          <Stat label="Exposure" value={wallet?.exposure} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/deposit" className={`${t5BtnPrimary} text-sm`}>Deposit</Link>
          <Link href="/withdraw" className={`${t5BtnOutline} text-sm`}>Withdraw</Link>
        </div>
      </T5Card>
    </T5FormPage>
  );
}
