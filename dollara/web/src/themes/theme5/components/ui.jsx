'use client';

// Shared VELPLAY (theme5) presentational primitives — a light three-column
// portal look. Pure styling; no data logic here. Analogous to
// theme4/components/ui.jsx but for the navy/blue palette pinned by
// `.theme5-root` (see globals.css).

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const t5Input =
  'w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-[#0f1b33] placeholder-[#94a3b8] shadow-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15';

export const t5Select = `${t5Input} appearance-none`;

export const t5BtnPrimary =
  'rounded-lg bg-[#101c33] px-6 py-3 font-black uppercase tracking-wide text-white shadow-[0_8px_20px_-10px_rgba(16,28,51,0.9)] transition hover:bg-[#1b2a48] active:brightness-95 disabled:opacity-60';

export const t5BtnOutline =
  'rounded-lg border border-[#101c33]/20 bg-white px-6 py-3 font-black uppercase tracking-wide text-[#101c33] shadow-sm transition hover:border-[#1d4ed8] hover:text-[#1d4ed8] disabled:opacity-60';

export function T5Card({ className = '', children }) {
  return (
    <div className={`rounded-xl border border-black/[0.06] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// The navy angled tab + white strip that heads every home section
// ("⚽ LIVE SPORTS", "🔥 TRENDING GAMES", …). Optional rail arrows and a
// SEE ALL / VIEW ALL link on the right, matching the reference.
export function T5SectionBar({ icon, title, seeAllHref, seeAllLabel = 'See All', onPrev, onNext, className = '' }) {
  return (
    <div className={`flex items-stretch overflow-hidden rounded-lg bg-white shadow-sm ${className}`}>
      <div className="theme5-tab flex items-center gap-2 py-2.5 pl-4">
        {icon && <span className="text-sm leading-none">{icon}</span>}
        <h2 className="whitespace-nowrap text-sm font-black uppercase tracking-wide text-white">{title}</h2>
      </div>
      <div className="ml-auto flex items-center gap-2 py-2 pr-3">
        {(onPrev || onNext) && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Scroll left"
              className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Scroll right"
              className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-[#0f1b33] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="rounded-lg border border-[#1d4ed8] px-3.5 py-1.5 text-[0.7rem] font-black uppercase tracking-wide text-[#1d4ed8] transition hover:bg-[#1d4ed8] hover:text-white"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

// Dark header used on the side-rail panels (SPORTS / CASINO GAMES / MY PROFILE).
export function T5PanelHead({ icon, children }) {
  return (
    <div className="theme5-panel-head flex items-center gap-2 rounded-t-xl px-4 py-3">
      {icon && <span className="text-sm leading-none">{icon}</span>}
      <h3 className="text-sm font-black uppercase tracking-wide text-white">{children}</h3>
    </div>
  );
}

// The small pink LIVE pill used through the sidebars and category lists.
export function T5LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f4547a] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
    </span>
  );
}

// Centered page wrapper for narrow forms (deposit, withdraw, profile, etc.).
export function T5FormPage({ title, subtitle, maxWidth = 'max-w-2xl', children }) {
  return (
    <div className={`mx-auto ${maxWidth} px-4 py-6 sm:py-8`}>
      {title && (
        <div className="flex overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="theme5-tab py-2.5 pl-4">
            <h1 className="whitespace-nowrap text-sm font-black uppercase tracking-wide text-white sm:text-base">
              {title}
            </h1>
          </div>
        </div>
      )}
      {subtitle && <p className="mt-3 text-sm text-[#64748b]">{subtitle}</p>}
      {children}
    </div>
  );
}
