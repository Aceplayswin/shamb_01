'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

/** Redirect authenticated users away from login/register pages. */
export function useGuestOnly(redirectTo = '/profile') {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && token) router.replace(redirectTo);
  }, [isHydrated, token, router, redirectTo]);

  return { isHydrated, token };
}
