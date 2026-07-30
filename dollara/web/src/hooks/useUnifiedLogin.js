'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useDemoLogin } from '@/hooks/useDemoLogin';

const SWAL_BASE = { confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0' };

/**
 * Player sign-in shared by every theme's Login page: phone + password →
 * /api/v1/auth/login → role `user` → "/".
 *
 * Staff/admin sign-in used to live here behind a "Staff" toggle. The admin
 * console is now a separate app with its own login, so this UI is player-only
 * and the two apps never share a session.
 */
export function useUnifiedLogin({ swal = {}, onSuccess } = {}) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [identifier, setIdentifier] = useState(''); // phone
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { tryDemo, demoLoading } = useDemoLogin({ swal });

  const swalOpts = { ...SWAL_BASE, ...swal };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (loading || demoLoading) return;
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: identifier, password }),
      });
      setAuth({ token: result.token, userId: result.userId, isDemo: false });
      onSuccess?.();
      await Swal.fire({
        title: 'Welcome back!',
        text: 'You have successfully logged in.',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
        ...swalOpts,
      });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text: err instanceof Error ? err.message : 'Invalid phone or password',
        icon: 'error',
        ...swalOpts,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    demoLoading,
    submit,
    tryDemo,
  };
}
