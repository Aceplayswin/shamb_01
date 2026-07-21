'use client';

import Link from 'next/link';
import { Lock, Phone } from 'lucide-react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { PasswordInput } from '@/components/PasswordInput';
import { T2FormPage, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Login() {
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
    <T2FormPage title="Welcome back" subtitle="Sign in with your phone and password.">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Phone Number"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={`${t2Input} pl-11`}
            autoComplete="tel"
            required
          />
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
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loading} className={`${t2BtnPrimary} w-full`}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        New user?{' '}
        <Link href="/register" className="font-bold text-amber-400 hover:text-amber-300">
          Register
        </Link>
      </p>
    </T2FormPage>
  );
}
