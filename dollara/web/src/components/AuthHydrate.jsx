'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { captureReferralFromLocation } from '@/lib/referral';

export function AuthHydrate({ children }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const token = useAuthStore((s) => s.token);
  const sessionMessage = useAuthStore((s) => s.sessionMessage);
  const clearSessionMessage = useAuthStore((s) => s.clearSessionMessage);

  useEffect(() => {
    captureReferralFromLocation();
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) refreshSession();
  }, [token, refreshSession]);

  return (
    <>
      {sessionMessage && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-[1000] flex items-center justify-center gap-3 bg-red-600 px-4 py-2 text-sm text-white shadow"
        >
          <span>{sessionMessage}</span>
          <button
            type="button"
            onClick={clearSessionMessage}
            className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
          >
            Dismiss
          </button>
        </div>
      )}
      {children}
    </>
  );
}
