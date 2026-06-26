'use client';

import Link from 'next/link';
import { Lock, Phone, User as UserIcon, ShieldCheck, Users } from 'lucide-react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { PasswordInput } from '@/components/PasswordInput';

export default function Theme1Login() {
  useGuestOnly();
  const {
    isStaff,
    switchMode,
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    demoLoading,
    submit,
    tryDemo,
  } = useUnifiedLogin();

  const IdIcon = isStaff ? UserIcon : Phone;

  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-12">
      <div className="ring-grad relative overflow-hidden rounded-3xl bg-panel-strong bg-mesh-violet p-8 sm:p-10">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />

        <div className="relative">
          <h1 className="font-display text-2xl font-black text-app-fg sm:text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            {isStaff
              ? 'Staff sign in with your username and password.'
              : 'Sign in with your phone and password.'}
          </p>

          {/* Account-type switch */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-hairline/10 bg-panel/40 p-1">
            <button
              type="button"
              onClick={() => switchMode('user')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                !isStaff ? 'bg-brand-500 text-surface-950 shadow-glow' : 'text-muted hover:text-app-fg'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Player
            </button>
            <button
              type="button"
              onClick={() => switchMode('staff')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                isStaff ? 'bg-brand-500 text-surface-950 shadow-glow' : 'text-muted hover:text-app-fg'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Staff
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="relative">
              <IdIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type={isStaff ? 'text' : 'tel'}
                inputMode={isStaff ? 'text' : 'tel'}
                placeholder={isStaff ? 'Username' : 'Phone Number'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-4 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none"
                autoComplete={isStaff ? 'username' : 'tel'}
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
              disabled={loading || demoLoading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : isStaff ? 'Sign in to console' : 'Log in'}
            </button>
          </form>

          {isStaff ? (
            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
              <ShieldCheck className="h-3.5 w-3.5" /> Authorized personnel only
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
