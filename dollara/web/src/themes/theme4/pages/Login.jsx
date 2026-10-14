'use client';

// Theme4 /login route. Auth is presented as a modal (matching the exchange
// reference), so this page simply opens the shell's login modal and shows a
// fallback CTA in case the modal is dismissed. useGuestOnly redirects
// already-authenticated users away.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '../shell/authModalContext';
import { t4BtnPrimary } from '../components/ui';

export default function Theme4Login() {
  useGuestOnly();
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('login');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-[#13272b]">Sign in to continue</h1>
          <p className="mt-2 text-sm text-[#5d7378]">The login window was closed.</p>
          <button onClick={() => open('login')} className={`${t4BtnPrimary} mt-6`}>
            Open Login
          </button>
        </div>
      )}
    </div>
  );
}
