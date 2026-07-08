'use client';

// Theme3 footer — dark purple, matching the VELPLAY reference: brand blurb, quick
// navigation, accepted payment modes card, legal badges, and a responsible-gaming
// line. Brand name comes from useBranding.

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';

const QUICK_NAV = [
  { label: 'Live Betting', href: NAV_GAME_LINKS.sports },
  { label: 'Cricket Hub', href: NAV_GAME_LINKS.sports },
  { label: 'Casino Lobby', href: NAV_GAME_LINKS.casino },
  { label: 'Direct Support', href: '/support/chat' },
  { label: 'Promotions', href: '/register' },
  { label: 'Get App', href: '/' },
];

const PAY_MODES = ['UPI', 'GPay', 'PhonePe', 'Net Banking', 'Paytm'];

export function Theme3Footer() {
  const branding = useBranding();
  const name = branding.product_name || 'VELPLAY365';
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-gradient-to-b from-[#241b3a] to-[#1a1230] text-white/80">
      <div className="mx-auto max-w-[1500px] px-5 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#e9c56b] to-[#b8862f] text-base font-black text-[#241b0e]">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="font-display text-lg font-black text-white">
                {name}
                <span className="block text-[0.55rem] font-bold tracking-[0.3em] text-[#e9c56b]/80">PLAY WIN</span>
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
              <span className="font-bold text-white/85">{name}</span> is a platform for live and
              uninterrupted online betting for sports, Live 24hr betting with a wide spectrum of sports
              such as Cricket, Soccer, Horse Racing, Kabaddi,{' '}
              <span className="font-bold text-[#e9c56b]">Aviator Predictor</span>, Hockey, Basketball,{' '}
              <span className="font-bold text-[#e9c56b]">Andar Bahar Game</span> and many more.
            </p>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-white">
              100% Safe &amp; Instant Payments
            </p>
            <p className="mt-2 max-w-md text-xs text-white/50">
              You can make payments and receive earnings instantly via your UPI ID…
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-white/15 px-2.5 py-1 text-[0.6rem] font-black text-white/70">18+ ONLY</span>
              <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/15 text-[0.6rem] font-black text-white/70">G</span>
              <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/15 text-[0.6rem] font-black text-white/70">GT</span>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#e9c56b] to-[#b8862f] px-3 py-1.5 text-xs font-black text-[#241b0e]"
              >
                <Download className="h-3.5 w-3.5" /> GET APP
              </Link>
            </div>
          </div>

          {/* Quick navigation */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[#8ea3ff]">Quick Navigation</h4>
            <ul className="mt-4 space-y-2.5">
              {QUICK_NAV.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/65 transition hover:text-[#e9c56b]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payments */}
          <div>
            <h4 className="text-center text-xs font-black uppercase tracking-[0.18em] text-white/80">
              Accepted Modes of Payments
            </h4>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-center text-[0.6rem] font-black uppercase tracking-[0.2em] text-white/50">
                Payment Options
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {PAY_MODES.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-black text-[#241b3a]"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-center text-[0.6rem] font-bold uppercase tracking-wide text-white/45">
                UPI / GPAY / PHONEPE / NET BANKING / PAYTM
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/55">
            <span>© Copyright {year} {name}</span>
            <Link href="/" className="hover:text-[#e9c56b]">Responsible Gambling</Link>
            <Link href="/" className="hover:text-[#e9c56b]">Terms &amp; Condition</Link>
            <Link href="/" className="hover:text-[#e9c56b]">KYC Policy</Link>
          </p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#e9c56b]">
            Gambling can be addictive, please play responsibly
          </p>
        </div>
      </div>
    </footer>
  );
}
