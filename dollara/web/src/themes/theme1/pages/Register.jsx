'use client';

// Theme1 /register route. Same popup-based approach as /login: open the shell's
// register modal, with a fallback CTA if it's dismissed. Authenticated users are
// sent to /onboarding by useGuestOnly.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '@/hooks/useAuthModal';

export default function Theme1Register() {
  useGuestOnly('/onboarding');
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('register');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-app-fg">Create your account</h1>
          <p className="mt-2 text-sm text-muted">The signup window was closed.</p>
          <button
            onClick={() => open('register')}
            className="mt-6 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500"
          >
            Open Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
