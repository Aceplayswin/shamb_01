'use client';

// Shared WAXCASINO (theme2) presentational primitives so every theme2 page has a
// consistent dark-navy / gold look. Pure styling — no data logic here.

export const t2Input =
  'w-full rounded-xl border border-white/10 bg-[#070d16] px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-amber-400/60';

export const t2Select = `${t2Input} appearance-none`;

export const t2BtnPrimary =
  'rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-6 py-3 font-bold text-black shadow-[0_0_18px_-6px_rgba(245,197,66,0.8)] transition hover:from-amber-300 hover:to-amber-500 disabled:opacity-60';

export const t2BtnGhost =
  'rounded-xl border border-white/10 px-6 py-3 font-bold text-white transition hover:border-amber-400/50';

export function T2Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-[#0d1420] ${className}`}>{children}</div>
  );
}

// Centered page wrapper for narrow forms (auth, deposit, etc.).
export function T2FormPage({ title, subtitle, maxWidth = 'max-w-md', children }) {
  return (
    <div className={`mx-auto ${maxWidth} px-4 py-10 sm:py-14`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-amber-600/15 via-[#0d1420] to-[#070d16] p-7 sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative">
          {title && <h1 className="font-display text-2xl font-black text-white sm:text-3xl">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
