'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export function AuthHydrate({ children }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token) refreshSession();
  }, [token, refreshSession]);

  return children;
}
