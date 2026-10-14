'use client';

// Theme1 /login route. Auth is presented as a popup, so this page just opens the
// shell's login modal and shows a fallback CTA if it's dismissed. useGuestOnly
// redirects already-authenticated users away.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '@/hooks/useAuthModal';

export default function Theme1Login() {
  useGuestOnly();
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('login');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-app-fg">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted">The login window was closed.</p>
          <button
            onClick={() => open('login')}
            className="mt-6 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
          >
            Open Login
          </button>
        </div>
      )}
    </div>
  );
}
