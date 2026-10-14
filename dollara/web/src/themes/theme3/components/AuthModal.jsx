'use client';

// Split-panel auth modal shell (theme3): a dark gradient info panel on the left
// and a cream form panel on the right, over a blurred backdrop — matching the
// VELPLAY login/register popups. Login and Register forms both render inside this.

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * @param onClose   close handler (backdrop / ✕ / Esc)
 * @param brandInitial single letter for the little rounded logo tile
 * @param sideTitle title on the dark left panel
 * @param sideText  paragraph under the side title
 * @param sideRows  [{ label, value }] the three stat rows on the dark panel
 * @param children  the form (right panel content)
 */
export function AuthModal({ onClose, brandInitial = 'V', sideTitle, sideText, sideRows = [], children }) {
  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative z-10 grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ── Left: dark info panel ── */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a2140] via-[#241b3a] to-[#170f28] p-7 text-white md:flex">
          <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#c79a3b]/25 blur-3xl" />
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#e9c56b] to-[#b8862f] text-lg font-black text-[#241b0e] shadow-lg">
              {brandInitial}
            </span>
            <h3 className="mt-6 font-display text-2xl font-black leading-tight">{sideTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{sideText}</p>
          </div>
          <div className="relative mt-8 space-y-3">
            {sideRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">{r.label}</span>
                <span className="text-sm font-black text-[#e9c56b]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: cream form panel ── */}
        <div className="relative bg-gradient-to-br from-[#fdfbf6] via-white to-[#f7f2e9] p-7 sm:p-9">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-[#6b6579] transition hover:text-[#1b1726]"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
