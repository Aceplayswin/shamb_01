'use client';

// Theme3 /login route. Auth is presented as a modal (matching the reference), so
// this page simply opens the shell's login modal and shows a soft cream backdrop
// with a fallback CTA (in case the modal is dismissed). useGuestOnly redirects
// already-authenticated users away.

import { useEffect } from 'react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useAuthModal } from '../shell/authModalContext';

export default function Theme3Login() {
  useGuestOnly();
  const { open, mode } = useAuthModal();

  useEffect(() => {
    open('login');
  }, [open]);

  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-16 text-center">
      {mode == null && (
        <div>
          <h1 className="font-display text-2xl font-black text-[#1b1726]">Sign in to continue</h1>
          <p className="mt-2 text-sm text-[#6b6579]">The login window was closed.</p>
          <button
            onClick={() => open('login')}
            className="mt-6 rounded-xl bg-gradient-to-br from-[#e9c56b] via-[#c79a3b] to-[#b8862f] px-6 py-3 font-black text-[#241b0e] shadow-lg"
          >
            Open Login
          </button>
        </div>
      )}
    </div>
  );
}
