'use client';

// Theme2 /login route. Auth is presented as a popup, so this page just opens the
// shell's login modal and shows a fallback CTA if it's dismissed. useGuestOnly
// redirects already-authenticated users away.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '@/hooks/useAuthModal';

export default function Theme2Login() {
  useGuestOnly();
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('login');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-white">Sign in to continue</h1>
          <p className="mt-2 text-sm text-slate-400">The login window was closed.</p>
          <button
            onClick={() => open('login')}
            className="mt-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-6 py-3 font-bold text-black shadow-[0_0_18px_-6px_rgba(245,197,66,0.8)]"
          >
            Open Login
          </button>
        </div>
      )}
    </div>
  );
}
