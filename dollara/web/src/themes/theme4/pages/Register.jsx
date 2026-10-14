'use client';

// Theme4 /register route. Same modal-based approach as /login: open the shell's
// register modal, with a fallback CTA if it's dismissed. Authenticated users are
// sent to /onboarding by useGuestOnly.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '../shell/authModalContext';
import { t4BtnPrimary } from '../components/ui';

export default function Theme4Register() {
  useGuestOnly('/onboarding');
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('register');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-[#13272b]">Create your account</h1>
          <p className="mt-2 text-sm text-[#5d7378]">The signup window was closed.</p>
          <button onClick={() => open('register')} className={`${t4BtnPrimary} mt-6`}>
            Open Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
