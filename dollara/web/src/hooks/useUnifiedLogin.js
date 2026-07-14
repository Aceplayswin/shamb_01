'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { setAdminToken, setAdminRole } from '@/services/adminApi';
import { useDemoLogin } from '@/hooks/useDemoLogin';

const SWAL_BASE = { confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0' };

/**
 * Single sign-in entry point shared by every theme's Login page.
 *
 * One UI, two account types, role-based routing:
 *   - `user` mode  → phone + password → /api/v1/auth/login → role `user` → "/"
 *   - `staff` mode → username + password → /api/v1/admin/auth/login →
 *                    role `admin`/`super_admin` → "/admin"
 *
 * The server is the source of truth for the role; the chosen mode only decides
 * which endpoint and which credential field is used. Admin sessions are kept in
 * the `admin_token` store (see services/adminApi) so the admin console and the
 * player app never share a session.
 */
export function useUnifiedLogin({ swal = {} } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Deep link into staff mode via /login?staff=1 (used by the /admin/login redirect).
  const initialMode = searchParams?.get('staff') === '1' ? 'staff' : 'user';
  const [mode, setMode] = useState(initialMode); // 'user' | 'staff'
  const [identifier, setIdentifier] = useState(''); // phone or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { tryDemo, demoLoading } = useDemoLogin({ swal });

  const swalOpts = { ...SWAL_BASE, ...swal };

  const switchMode = (next) => {
    setMode(next);
    setIdentifier('');
    setPassword('');
  };

  const loginAsUser = async () => {
    const result = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: identifier, password }),
    });
    setAuth({ token: result.token, userId: result.userId, isDemo: false });
    await Swal.fire({
      title: 'Welcome back!',
      text: 'You have successfully logged in.',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      ...swalOpts,
    });
    router.push('/');
  };

  const loginAsStaff = async () => {
    // Admin auth has its own endpoint and token store, kept apart from the
    // player session so console access never leaks into the game app.
    const result = await api('/api/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: identifier, password }),
    });
    setAdminToken(result.token);
    setAdminRole(result.role);
    await Swal.fire({
      title: 'Admin verified',
      text: 'Redirecting to the console…',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      ...swalOpts,
    });
    router.push('/admin');
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (loading || demoLoading) return;
    setLoading(true);
    try {
      if (mode === 'staff') {
        await loginAsStaff();
      } else {
        await loginAsUser();
      }
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text:
          err instanceof Error
            ? err.message
            : mode === 'staff'
            ? 'Invalid username or password'
            : 'Invalid phone or password',
        icon: 'error',
        ...swalOpts,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    isStaff: mode === 'staff',
    switchMode,
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
