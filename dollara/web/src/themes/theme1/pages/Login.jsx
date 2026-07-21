'use client';

import Link from 'next/link';
import { Lock, Phone } from 'lucide-react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { PasswordInput } from '@/components/PasswordInput';

export default function Theme1Login() {
  useGuestOnly();
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    submit,
  } = useUnifiedLogin();

  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-12">
      <div className="ring-grad relative overflow-hidden rounded-3xl bg-panel-strong bg-mesh-violet p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />

        <div className="relative">
          <h1 className="font-display text-2xl font-black text-app-fg sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in with your phone and password.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                inputMode="tel"
                placeholder="Phone Number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-4 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none"
                autoComplete="tel"
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
                toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted transition hover:text-app-fg"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Log in'}
            </button>
          </form>

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
