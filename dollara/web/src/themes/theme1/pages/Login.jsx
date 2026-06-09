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

export default function Theme1Login() {
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
        title: 'Success!',
        text: 'You have successfully logged in.',
        icon: 'success',
        confirmButtonColor: '#F5C542',
        timer: 1500,
        showConfirmButton: false,
      });
      setAuth({
        token: result.token,
        userId: result.userId,
        isDemo: false,
      });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text: err instanceof Error ? err.message : 'Invalid phone or password',
        icon: 'error',
        confirmButtonColor: '#F5C542',
      });
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = async () => {
    setDemoLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      setAuth({
        token: result.token,
        userId: result.demoId,
        username: result.demoId,
        isDemo: true,
      });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Demo failed',
        text: err instanceof Error ? err.message : 'Could not start demo session',
        icon: 'error',
        confirmButtonColor: '#F5C542',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-12">
      <div className="ring-grad relative overflow-hidden rounded-3xl bg-panel-strong bg-mesh-violet p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />

        <div className="relative">
          <h1 className="font-display text-2xl font-black text-app-fg sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in with your phone and password.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-4 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none"
                required
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-11 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-panel-strong px-2 text-muted">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={tryDemo}
            disabled={loading || demoLoading}
            className="w-full rounded-xl border border-hairline/20 bg-panel/40 py-3 font-semibold text-app-fg transition hover:border-brand-400/40 disabled:opacity-60"
          >
            {demoLoading ? 'Starting demo…' : 'Try demo — ₹50,000 balance'}
          </button>

          <p className="mt-6 text-center text-sm text-muted">
            New user?{' '}
            <Link href="/register" className="font-bold text-brand-400 transition-colors hover:text-brand-300">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
