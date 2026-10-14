'use client';

// Theme4 auth modal shell — a compact exchange-style card: teal gradient header
// strip with the brand mark, white form body, over a dimmed backdrop. Login and
// Register forms both render inside this.

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * @param onClose      close handler (backdrop / ✕ / Esc)
 * @param brandInitial single letter for the little brand tile
 * @param brandName    header brand label
 * @param headline     small white caption in the teal header
 * @param children     the form (body content)
 */
export function AuthModal({ onClose, brandInitial = 'D', brandName = '', headline, children }) {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Teal header strip */}
        <div className="theme4-header relative px-6 py-5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 -skew-x-6 place-items-center rounded bg-white text-xl font-black italic text-[#0e7480]">
              {brandInitial}
            </span>
            <div>
              <p className="font-display text-lg font-black uppercase leading-none tracking-wide text-white">
                {brandName}
              </p>
              {headline && <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/75">{headline}</p>}
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="p-6 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
