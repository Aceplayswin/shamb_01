'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { PasswordInput } from '@/components/PasswordInput';
import Swal from 'sweetalert2';
import { T2FormPage, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  useGuestOnly();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      Swal.fire({
        title: 'Success!', text: 'You have successfully logged in.', icon: 'success',
        confirmButtonColor: '#F5C542', timer: 1500, showConfirmButton: false,
        background: '#0d1420', color: '#e2e8f0',
      });
      setAuth({ token: result.token, userId: result.userId, isDemo: false });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed', text: err instanceof Error ? err.message : 'Invalid phone or password',
        icon: 'error', confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0',
      });
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = async () => {
    setDemoLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      setAuth({ token: result.token, userId: result.demoId, username: result.demoId, isDemo: true });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Demo failed', text: err instanceof Error ? err.message : 'Could not start demo session',
        icon: 'error', confirmButtonColor: '#F5C542', background: '#0d1420', color: '#e2e8f0',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <T2FormPage title="Welcome back" subtitle="Sign in with your phone and password.">
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${t2Input} pl-11`} required />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${t2Input} pl-11 pr-11`}
            toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
            required
            minLength={6}
          />
        </div>
        <button type="submit" disabled={loading || demoLoading} className={`${t2BtnPrimary} w-full`}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0d1420] px-2 text-slate-500">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={tryDemo}
        disabled={loading || demoLoading}
        className="w-full rounded-xl border border-slate-600 py-3 font-semibold text-slate-200 transition hover:border-amber-500/50 disabled:opacity-60"
      >
        {demoLoading ? 'Starting demo…' : 'Try demo — ₹50,000 balance'}
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        New user?{' '}
        <Link href="/register" className="font-bold text-amber-400 hover:text-amber-300">Register</Link>
      </p>
    </T2FormPage>
  );
}
