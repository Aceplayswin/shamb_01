'use client';

// Shared VELPLAY (theme3) presentational primitives — a light cream / gold look.
// Pure styling; no data logic here. Analogous to theme2/components/ui.jsx but for
// the light palette pinned by `.theme3-root` (see globals.css).

// Gold used across buttons / accents.
export const T3_GOLD_GRADIENT = 'linear-gradient(135deg, #e9c56b 0%, #c79a3b 55%, #b8862f 100%)';

export const t3Input =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[#1b1726] placeholder-[#9a94a8] shadow-sm outline-none transition focus:border-[#c79a3b]/70 focus:ring-2 focus:ring-[#c79a3b]/15';

export const t3Select = `${t3Input} appearance-none`;

export const t3BtnPrimary =
  'rounded-xl bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] px-6 py-3 font-bold text-[#241b0e] shadow-[0_10px_24px_-10px_rgba(199,154,59,0.9)] transition hover:brightness-105 active:brightness-95 disabled:opacity-60';

export const t3BtnOutline =
  'rounded-xl border border-[#c79a3b]/40 bg-white px-6 py-3 font-bold text-[#1b1726] shadow-sm transition hover:border-[#c79a3b] hover:bg-[#faf6ec] disabled:opacity-60';

export function T3Card({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-32px_rgba(36,27,58,0.45)] ${className}`}
    >
      {children}
    </div>
  );
}

// A small label chip like "SECURE ACCESS" / "NEW PLAYER BONUS".
export function T3Chip({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#f3ead4] px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#9a7a24] ${className}`}
    >
      {children}
    </span>
  );
}

// Centered page wrapper for narrow forms (deposit, withdraw, profile, etc.).
export function T3FormPage({ title, subtitle, maxWidth = 'max-w-2xl', children }) {
  return (
    <div className={`mx-auto ${maxWidth} px-4 py-8 sm:py-10`}>
      {title && <h1 className="font-display text-2xl font-black text-[#1b1726] sm:text-3xl">{title}</h1>}
      {subtitle && <p className="mt-2 text-sm text-[#6b6579]">{subtitle}</p>}
      {children}
    </div>
  );
}
