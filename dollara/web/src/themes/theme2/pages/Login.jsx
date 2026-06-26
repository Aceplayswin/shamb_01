'use client';

import Link from 'next/link';
import { Lock, Phone, User as UserIcon, ShieldCheck, Users } from 'lucide-react';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { PasswordInput } from '@/components/PasswordInput';
import { T2FormPage, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Login() {
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
    <T2FormPage
      title="Welcome back"
      subtitle={
        isStaff
          ? 'Staff sign in with your username and password.'
          : 'Sign in with your phone and password.'
      }
    >
      {/* Account-type switch */}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/5 bg-[#070d16] p-1">
        <button
          type="button"
          onClick={() => switchMode('user')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
            !isStaff
              ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Player
        </button>
        <button
          type="button"
          onClick={() => switchMode('staff')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
            isStaff
              ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Staff
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="relative">
          <IdIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type={isStaff ? 'text' : 'tel'}
            inputMode={isStaff ? 'text' : 'tel'}
            placeholder={isStaff ? 'Username' : 'Phone Number'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={`${t2Input} pl-11`}
            autoComplete={isStaff ? 'username' : 'tel'}
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
        <button type="submit" disabled={loading || demoLoading} className={`${t2BtnPrimary} w-full`}>
          {loading ? 'Signing in…' : isStaff ? 'Sign in to console' : 'Log in'}
        </button>
      </form>

      {isStaff ? (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Authorized personnel only
        </p>
      ) : (
        <>
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
            <Link href="/register" className="font-bold text-amber-400 hover:text-amber-300">
              Register
            </Link>
          </p>
        </>
      )}
    </T2FormPage>
  );
}
