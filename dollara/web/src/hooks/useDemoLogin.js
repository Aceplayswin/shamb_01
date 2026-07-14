'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const SWAL_BASE = { confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0' };

/**
 * Activates a disposable demo session (virtual balance, playable like a real
 * account, flagged is_demo on the backend). Shared by the header CTA and login.
 */
export function useDemoLogin({ swal = {}, redirectTo = '/' } = {}) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [demoLoading, setDemoLoading] = useState(false);
  const busyRef = useRef(false);
  const optsRef = useRef({ swal, redirectTo });
  optsRef.current = { swal, redirectTo };

  const tryDemo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setDemoLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      setAuth({
        token: result.token,
        userId: result.demoId,
        username: result.demoId,
        isDemo: true,
      });
      const { redirectTo: to } = optsRef.current;
      if (to) router.push(to);
    } catch (err) {
      Swal.fire({
        title: 'Demo failed',
        text: err instanceof Error ? err.message : 'Could not start demo session',
        icon: 'error',
        ...SWAL_BASE,
        ...optsRef.current.swal,
      });
    } finally {
      busyRef.current = false;
      setDemoLoading(false);
    }
  }, [setAuth, router]);

  return { tryDemo, demoLoading };
}
