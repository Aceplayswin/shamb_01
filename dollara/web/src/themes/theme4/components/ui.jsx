'use client';

// Shared EXCHANGE (theme4) presentational primitives — teal sports-exchange look
// (Radhe Exchange reference). Pure styling; no data logic here. Analogous to
// theme3/components/ui.jsx but for the teal palette pinned by `.theme4-root`
// (see globals.css).

// Teal used across buttons / chrome.
export const T4_TEAL_GRADIENT = 'linear-gradient(180deg, #17a2b0 0%, #0e7480 100%)';

export const t4Input =
  'w-full rounded border border-[#0e7480]/25 bg-white px-4 py-3 text-[#13272b] placeholder-[#8aa0a4] shadow-sm outline-none transition focus:border-[#0e7480] focus:ring-2 focus:ring-[#0e7480]/15';

export const t4Select = `${t4Input} appearance-none`;

export const t4BtnPrimary =
  'rounded bg-gradient-to-b from-[#17a2b0] to-[#0e7480] px-6 py-3 font-bold uppercase tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(14,116,128,0.9)] transition hover:brightness-110 active:brightness-95 disabled:opacity-60';

export const t4BtnOutline =
  'rounded border border-[#0e7480]/40 bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0e7480] shadow-sm transition hover:border-[#0e7480] hover:bg-[#eef6f7] disabled:opacity-60';

export function T4Card({ className = '', children }) {
  return (
    <div className={`rounded border border-black/[0.07] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// Teal section header bar like the "Cricket" / "Soccer" / "Top Games" strips.
export function T4SectionBar({ children, className = '' }) {
  return (
    <div className={`theme4-bar flex items-center justify-between rounded-t px-3 py-2 ${className}`}>
      <h2 className="text-sm font-bold text-white">{children}</h2>
    </div>
  );
}

// A small red chip like the nav "LIVE 0" badges.
export function T4LiveBadge({ count = 0 }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-[#e5342c] px-1 py-px text-[0.55rem] font-black leading-none text-white">
      LIVE <span className="rounded-sm bg-white/25 px-0.5">{count}</span>
    </span>
  );
}

// Centered page wrapper for narrow forms (deposit, withdraw, profile, etc.).
export function T4FormPage({ title, subtitle, maxWidth = 'max-w-2xl', children }) {
  return (
    <div className={`mx-auto ${maxWidth} px-4 py-8 sm:py-10`}>
      {title && (
        <div className="theme4-bar rounded px-4 py-2.5">
          <h1 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
            {title}
          </h1>
        </div>
      )}
      {subtitle && <p className="mt-3 text-sm text-[#5d7378]">{subtitle}</p>}
      {children}
    </div>
  );
}
