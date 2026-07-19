'use client';

// Theme5 auth modal shell — a compact portal-style card: navy header strip with
// the brand mark, white form body, over a dimmed backdrop. Login and Register
// forms both render inside this.

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * @param onClose   close handler (backdrop / ✕ / Esc)
 * @param brandName header brand label
 * @param headline  small caption under the brand label
 * @param children  the form (body content)
 */
export function AuthModal({ onClose, brandName = '', headline, children }) {
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
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Navy header strip on the blue rule */}
        <div className="relative border-b-2 border-[#1d4ed8] bg-[#101c33] px-6 py-5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="font-display text-xl font-black uppercase leading-none tracking-tight text-[#f5c518]">
            {brandName}
          </p>
          {headline && (
            <p className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/70">
              {headline}
            </p>
          )}
        </div>

        {/* Form body */}
        <div className="p-6 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
