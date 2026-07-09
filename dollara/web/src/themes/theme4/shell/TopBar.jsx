'use client';

// Theme4 top chrome — two stacked strips matching the exchange reference:
//   1. A near-black announcement ticker (megaphone + marquee text, live clock).
//   2. The teal gradient header: brand mark left, LOG IN (or wallet + profile)
//      right. LOG IN opens the shell's auth modal.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, User, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useBranding } from '@/hooks/useBranding';
import { ProfileMenu } from '@/components/ProfileMenu';
import { useAuthModal } from './authModalContext';

const TICKER = 'Unmatched Betting Excitement and Access 500+ Casino and Online Games';

// Live "09 Jul 2026 12:48:12" clock. Rendered only after mount so the SSR HTML
// never disagrees with the client (avoids a hydration mismatch).
function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="inline-block w-36" aria-hidden />;
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-GB', { hour12: false });
  return (
    <span className="whitespace-nowrap font-mono text-[0.65rem] tracking-wide text-white/85">
      {date.replace(/ /g, ' ')} {time}
    </span>
  );
}

export function Theme4BrandMark({ name, dark = false }) {
  const label = name || 'DOLLARA';
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span
        className={`grid h-9 w-9 -skew-x-6 place-items-center rounded ${
          dark ? 'bg-[#0a5560] text-white' : 'bg-white text-[#0e7480]'
        } text-lg font-black italic shadow-sm`}
      >
        {label.charAt(0).toUpperCase()}
      </span>
      <span className={`font-display text-lg font-black uppercase leading-none tracking-wide ${dark ? 'text-[#13272b]' : 'text-white'}`}>
        {label}
        <span className={`block text-[0.5rem] font-bold tracking-[0.4em] ${dark ? 'text-[#0e7480]' : 'text-white/70'}`}>
          EXCHANGE
        </span>
      </span>
    </Link>
  );
}

export function Theme4TopBar() {
  const branding = useBranding();
  const { open } = useAuthModal();

  const token = useAuthStore((s) => s.token);
  const wallet = useAuthStore((s) => s.wallet);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const balance = wallet?.available ?? wallet?.main ?? 0;

  return (
    <header className="sticky top-0 z-40">
      {/* Announcement ticker */}
      <div className="flex items-center gap-3 bg-[#101c1e] px-3 py-1.5">
        <Megaphone className="h-3.5 w-3.5 shrink-0 -scale-x-100 text-white/80" />
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee gap-16 whitespace-nowrap">
            {[TICKER, TICKER].map((t, i) => (
              <span key={i} className="text-[0.65rem] font-semibold tracking-wide text-white/85">
                {t}
              </span>
            ))}
          </div>
        </div>
        <Clock />
      </div>

      {/* Teal gradient header */}
      <div className="theme4-header">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-3 py-2.5">
          <Theme4BrandMark name={branding.product_name} />

          {isHydrated && token ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded border border-white/25 bg-[#0a5560]/60 py-1 pl-3 pr-1 sm:flex">
                <Wallet className="h-4 w-4 text-white/80" />
                <span className="text-sm font-black text-white">
                  ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Link
                  href="/deposit"
                  className="rounded bg-white px-3 py-1 text-xs font-black uppercase text-[#0e7480] transition hover:brightness-95"
                >
                  Deposit
                </Link>
              </div>
              <ProfileMenu variant="theme4" />
            </div>
          ) : isHydrated ? (
            <button
              onClick={() => open('login')}
              className="flex items-center gap-1.5 rounded border border-white/30 bg-[#0a5560] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-[#094b55]"
            >
              <User className="h-3.5 w-3.5" /> Log In
            </button>
          ) : (
            <span className="inline-block h-8 w-24" aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}
