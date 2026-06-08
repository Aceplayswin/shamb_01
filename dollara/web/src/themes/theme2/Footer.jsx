'use client';

import Link from 'next/link';
import { Gem, Headset } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

// Theme 2 — "Midnight" footer: compact, centered, distinct from theme1's wide grid.
const LINKS = ['Sports', 'Casino', 'Slots', 'Promotions', 'Deposit', 'Withdraw', 'About', 'Terms', 'Privacy', 'Responsible Gaming'];

export function Footer() {
  const branding = useBranding();
  const brandName = branding.product_name;

  return (
    <footer className="mt-20 border-t border-hairline/[0.08] bg-panel-strong/40">
      <div className="mx-auto max-w-[1500px] px-4 py-12 xl:px-8">
        <div className="flex flex-col items-center text-center">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl text-surface-950 shadow-glow"
            style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
          >
            <Gem className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="mt-3 font-display text-2xl font-extrabold text-app-fg">{brandName}</span>
          <p className="mt-2 max-w-md text-sm text-muted">
            Live betting across Cricket, Soccer, Aviator, Andar Bahar and 2,000+ games — fast payouts, fair play, 24/7 support.
          </p>

          <Link
            href="/support/chat"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-hairline/10 px-4 py-2 text-xs font-bold text-app-fg transition hover:border-emerald-400/50 hover:bg-panel"
          >
            <Headset className="h-4 w-4 text-emerald-400" /> 24/7 Live support
          </Link>

          <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <Link key={link} href="#" className="text-muted transition-colors hover:text-brand-400">
                {link}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-hairline/[0.06] pt-6 sm:flex-row">
          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted/80">
            <span className="rounded-md border border-hairline/10 bg-panel px-2 py-1 text-red-400">18+</span>
            <span>© 2026 {brandName}. All rights reserved.</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-400/80">
            Play responsibly · Gambling can be addictive
          </p>
        </div>
      </div>
    </footer>
  );
}
