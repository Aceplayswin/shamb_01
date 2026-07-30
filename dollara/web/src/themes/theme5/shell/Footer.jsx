'use client';

// Theme5 footer — the white three-column card from the reference: brand blurb +
// safety badges + GET APP on the left, quick navigation in the middle, accepted
// payment modes on the right, then the copyright / responsible-gambling strip.
// It renders INSIDE the centre column so the side rails flank it (as in the
// reference), which is why it is a plain card rather than a full-bleed band.

import Link from 'next/link';
import { Download, ArrowRight } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { NAV_GAME_LINKS } from '@/lib/gameRoutes';

const QUICK_NAV = [
  { label: 'Live Betting', href: NAV_GAME_LINKS.sports },
  { label: 'Cricket Hub', href: NAV_GAME_LINKS.sports },
  { label: 'Casino Lobby', href: NAV_GAME_LINKS.liveCasino },
  { label: 'Promotions', href: '/promotions' },
];

const PAYMENTS = ['UPI', 'GPay', 'PhonePe', 'Net Banking', 'Paytm'];

export function Theme5Footer() {
  const branding = useBranding();
  const name = branding.product_name || 'DOLLARA';

  return (
    <footer className="mt-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr_1.2fr]">
        {/* ── Brand blurb ── */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-[#101c33] px-2 py-1.5 font-display text-xs font-black italic leading-none tracking-tight text-[#f5c518]">
              {name.toUpperCase()}
            </span>
            <div>
              <p className="font-display text-lg font-black uppercase leading-none tracking-wide text-[#0f1b33]">
                {name}
              </p>
              <p className="mt-1 text-[0.6rem] font-bold tracking-[0.28em] text-[#94a3b8]">PLAY · WIN</p>
            </div>
          </div>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#475569]">
            Live betting on Cricket, Soccer, Kabaddi,{' '}
            <Link href={NAV_GAME_LINKS.crash} className="font-bold text-[#1d4ed8] hover:underline">
              Aviator Predictor
            </Link>
            ,{' '}
            <Link href={NAV_GAME_LINKS.liveCasino} className="font-bold text-[#1d4ed8] hover:underline">
              Andar Bahar
            </Link>{' '}
            and more.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[#f4547a]/40 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wide text-[#f4547a]">
              18+ Only
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-black/10 text-[0.65rem] font-black text-[#64748b]">
              G
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-black/10 text-[0.65rem] font-black text-[#64748b]">
              GT
            </span>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-[#22a34a] px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:brightness-110"
            >
              <Download className="h-4 w-4" /> Get App
            </Link>
          </div>
        </div>

        {/* ── Quick navigation ── */}
        <div>
          <h4 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-[#0f1b33]">
            <span className="h-px w-4 bg-[#0f1b33]" /> Quick Navigation
          </h4>
          <ul className="mt-3 space-y-2">
            {QUICK_NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-1.5 text-sm text-[#475569] transition hover:text-[#1d4ed8]"
                >
                  {item.arrow && <ArrowRight className="h-3.5 w-3.5 text-[#0f1b33]" />}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Accepted payment modes ── */}
        <div>
          <h4 className="text-center font-display text-sm font-black uppercase tracking-[0.12em] text-[#0f1b33] lg:text-left">
            Accepted Modes of Payments
          </h4>
          <div className="mt-3 rounded-xl border border-black/[0.07] bg-[#f8fafc] p-3.5 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAYMENTS.map((p) => (
                <span
                  key={p}
                  className="rounded-lg border border-black/[0.07] bg-white px-3 py-1 text-[0.7rem] font-black text-[#0f1b33] shadow-sm"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legal strip ── */}
      <div className="mt-5 border-t border-black/[0.06] pt-3 text-center">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#94a3b8]">
          <span>© Copyright {new Date().getFullYear()} {name}</span>
          <Link href="/rules" className="transition hover:text-[#1d4ed8]">Responsible Gambling</Link>
          <Link href="/rules" className="transition hover:text-[#1d4ed8]">Terms &amp; Condition</Link>
          <Link href="/profile" className="transition hover:text-[#1d4ed8]">KYC Policy</Link>
        </p>
        <p className="mt-1.5 text-[0.7rem] font-black uppercase tracking-wide text-[#1d4ed8]">
          Gambling can be addictive, please play responsibly
        </p>
      </div>
    </footer>
  );
}
