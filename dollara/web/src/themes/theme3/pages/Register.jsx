'use client';

// Theme3 /register route. Same modal-based approach as /login: open the shell's
// register modal, with a fallback CTA if it's dismissed. Authenticated users are
// sent to /onboarding by useGuestOnly.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '../shell/authModalContext';

export default function Theme3Register() {
  useGuestOnly('/onboarding');
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('register');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-[#1b1726]">Create your account</h1>
          <p className="mt-2 text-sm text-[#6b6579]">The signup window was closed.</p>
          <button
            onClick={() => open('register')}
            className="mt-6 rounded-xl bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] px-6 py-3 font-black text-[#241b0e] shadow-lg"
          >
            Open Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
