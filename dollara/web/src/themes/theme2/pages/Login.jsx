'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';
import Swal from 'sweetalert2';
import { T2FormPage, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      Swal.fire({
        title: 'Success!', text: 'You have successfully logged in.', icon: 'success',
        confirmButtonColor: '#F5C542', timer: 1500, showConfirmButton: false,
        background: '#0d1420', color: '#e2e8f0',
      });
      setAuth({ token: result.token, userId: result.demoId, username: result.demoId, isDemo: true });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed', text: err instanceof Error ? err.message : 'Could not start demo session',
        icon: 'error', confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <T2FormPage title="Welcome back" subtitle="Enter any details to login (Static Demo).">
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${t2Input} pl-11`} required />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${t2Input} pl-11`} required />
        </div>
        <button type="submit" disabled={loading} className={`${t2BtnPrimary} w-full`}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        New user?{' '}
        <Link href="/register" className="font-bold text-amber-400 hover:text-amber-300">Register</Link>
      </p>
    </T2FormPage>
  );
}
