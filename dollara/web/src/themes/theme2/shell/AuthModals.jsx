'use client';

// Theme2 Login + Register popups. Which one shows is driven by the app-wide
// auth-modal context (src/hooks/useAuthModal). Data/auth wiring is the SHARED
// layer:
//   - Login  → useUnifiedLogin (player mode, phone + password).
//   - Register → full name + phone + password. Direct sign-up, no verification.
// The shell mounts <Theme2AuthModals/> once.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Lock, Phone, User, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { useAuthModal } from '@/hooks/useAuthModal';
import { PasswordInput } from '@/components/PasswordInput';
import { t2Input, t2BtnPrimary } from '../components/ui';

function ModalShell({ onClose, title, subtitle, children }) {
  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="theme2-root fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-amber-600/15 via-[#0d1420] to-[#070d16] p-7 sm:p-9">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-[#0a101a] text-slate-400 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative">
          {title && <h1 className="font-display text-2xl font-black text-white sm:text-3xl">{title}</h1>}
          {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginModal({ onClose, switchTo }) {
  const token = useAuthStore((s) => s.token);
  const { identifier, setIdentifier, password, setPassword, loading, submit } = useUnifiedLogin();

  useEffect(() => {
    if (token) onClose();
  }, [token, onClose]);

  return (
    <ModalShell onClose={onClose} title="Welcome back" subtitle="Sign in with your phone and password.">
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
        <button type="button" onClick={() => switchTo('register')} className="font-bold text-amber-400 hover:text-amber-300">
          Register
        </button>
      </p>
    </ModalShell>
  );
}

function RegisterModal({ onClose, switchTo }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) onClose();
  }, [token, onClose]);

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, fullName, password, referralCode: referralCode.trim() || undefined }),
      });
      setAuth({ token: result.token, userId: result.userId, username: result.username });
      onClose();
      router.push('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Create account" subtitle="Instant access. KYC required before first withdrawal.">
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-6 space-y-4">
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${t2Input} pl-11`} />
        </div>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${t2Input} pl-11`} />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <PasswordInput
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${t2Input} pl-11 pr-11`}
            toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
            minLength={6}
            required
          />
        </div>
        <div className="relative">
          <Gift className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Referral code (optional)" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className={`${t2Input} pl-11 uppercase tracking-widest`} maxLength={20} />
        </div>
        <button type="button" onClick={register} disabled={loading || !phone || !fullName || password.length < 6} className={`${t2BtnPrimary} w-full`}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <button type="button" onClick={() => switchTo('login')} className="font-bold text-amber-400 hover:text-amber-300">Login</button>
      </p>
      <p className="mt-4 text-center text-xs text-slate-500">18+ Only. By registering you agree to our Terms &amp; Conditions.</p>
    </ModalShell>
  );
}

export function Theme2AuthModals() {
  const { mode, open, close } = useAuthModal();
  if (mode === 'login') return <LoginModal onClose={close} switchTo={open} />;
  if (mode === 'register') return <RegisterModal onClose={close} switchTo={open} />;
  return null;
}
