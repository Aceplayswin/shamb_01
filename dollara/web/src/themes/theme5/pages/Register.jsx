'use client';

// Theme5 /register route. Same modal-based approach as /login: open the shell's
// register modal, with a fallback CTA if it's dismissed. Authenticated users are
// sent to /onboarding by useGuestOnly.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '../shell/authModalContext';
import { t5BtnPrimary } from '../components/ui';

export default function Theme5Register() {
  useGuestOnly('/onboarding');
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('register');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-[#0f1b33]">Create your account</h1>
          <p className="mt-2 text-sm text-[#64748b]">The signup window was closed.</p>
          <button onClick={() => open('register')} className={`${t5BtnPrimary} mt-6`}>
            Open Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
