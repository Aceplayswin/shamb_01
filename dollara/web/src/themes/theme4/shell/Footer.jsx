'use client';

// Theme4 footer — matches the exchange reference: the "STEP INTO LIVE ACTION /
// DOWNLOAD APK" dark banner, a light provider-logo band (wordmarks), and the
// dark-teal 18+ responsibility strip.

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { Theme4BrandMark } from './TopBar';

const PROVIDERS = [
  'Evolution Gaming',
  'Ezugi',
  'Pragmatic Play',
  'betgames.tv',
  'Super Spade',
  'BETSOFT',
  'SPRIBE',
  'evoplay',
];

export function Theme4Footer() {
  const branding = useBranding();
  const name = branding.product_name || 'DOLLARA';

  return (
    <footer className="mt-6">
      {/* ── Download APK banner ── */}
      <div className="relative overflow-hidden bg-[#0a0f1e]">
        <div className="pointer-events-none absolute -left-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#1f6feb]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#17a2b0]/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-4 py-8 sm:flex-row sm:justify-between">
          {/* Glowing ring */}
          <div className="hidden shrink-0 sm:block">
            <span className="grid h-28 w-28 place-items-center rounded-full border-4 border-[#2ea8ff]/70 shadow-[0_0_40px_rgba(46,168,255,0.55),inset_0_0_30px_rgba(46,168,255,0.35)]">
              <span className="text-3xl">🏟️</span>
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-8 sm:text-left">
            <div>
              <p className="font-display text-2xl font-black italic tracking-wide text-white sm:text-3xl">
                STEP INTO LIVE ACTION
              </p>
              <p className="mt-1 text-xs text-white/60">
                Download the Official APK and Bet Anytime, Anywhere
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white hover:text-[#0a0f1e]"
            >
              <Download className="h-4 w-4" /> Download APK
            </Link>
          </div>

          <div className="shrink-0">
            <Theme4BrandMark name={name} />
          </div>
        </div>
      </div>

      {/* ── Provider logo band ── */}
      <div className="bg-[#f2f5f6]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6">
          {PROVIDERS.map((p) => (
            <span
              key={p}
              className="font-display text-sm font-black uppercase tracking-widest text-[#5d7378] opacity-80 transition hover:opacity-100"
            >
              {p}
            </span>
          ))}
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#5d7378] text-[0.6rem] font-black text-[#5d7378]">
            18+
          </span>
        </div>
      </div>

      {/* ── Responsibility strip ── */}
      <div className="theme4-bar px-4 py-2.5 text-center">
        <p className="mx-auto max-w-[1100px] text-[0.65rem] font-semibold leading-relaxed text-white/85">
          You must be over 18 years old, or the legal age at which gambling or gaming activities are
          allowed under the law or jurisdiction that applies to you. You must reside in a country in
          which access to online gambling is allowed to its residents.
        </p>
      </div>
    </footer>
  );
}
