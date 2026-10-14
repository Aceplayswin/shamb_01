'use client';

// Theme1 Login + Register popups. Which one shows is driven by the app-wide
// auth-modal context (src/hooks/useAuthModal). Data/auth wiring is the SHARED
// layer:
//   - Login  → useUnifiedLogin (player mode, phone + password).
//   - Register → full name + phone + password. Direct sign-up, no verification.
// Both render over a blurred backdrop; the shell mounts <Theme1AuthModals/> once.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Lock, Phone, User, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { useAuthModal } from '@/hooks/useAuthModal';
import { PasswordInput } from '@/components/PasswordInput';

const inputClass =
  'w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-4 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none';

const passwordClass =
  'w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-11 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none';

const btnPrimary =
  'w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60';

function ModalShell({ onClose, mesh = 'bg-mesh-amber', children }) {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className={`ring-grad relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-3xl bg-panel-strong ${mesh} p-8 sm:p-10`}>
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-hairline/10 bg-panel/60 text-muted transition hover:text-app-fg"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function LoginModal({ onClose, switchTo }) {
  const token = useAuthStore((s) => s.token);
  const { identifier, setIdentifier, password, setPassword, loading, submit } = useUnifiedLogin();

  // Close once auth succeeds (the login hook redirects to "/").
  useEffect(() => {
    if (token) onClose();
  }, [token, onClose]);

  return (
    <ModalShell onClose={onClose} mesh="bg-mesh-violet">
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
            className={inputClass}
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
            className={passwordClass}
            toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted transition hover:text-app-fg"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New user?{' '}
        <button type="button" onClick={() => switchTo('register')} className="font-bold text-brand-400 transition-colors hover:text-brand-300">
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
    <ModalShell onClose={onClose} mesh="bg-mesh-amber">
      <h1 className="font-display text-2xl font-black text-app-fg sm:text-3xl">Create account</h1>
      <p className="mt-2 text-sm text-muted">Instant access. KYC required before first withdrawal.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
          <PasswordInput
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={passwordClass}
            minLength={6}
            required
          />
        </div>
        <div className="relative">
          <Gift className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Referral code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className={`${inputClass} uppercase tracking-widest`}
            maxLength={20}
          />
        </div>
        <button
          type="button"
          onClick={register}
          disabled={loading || !phone || !fullName || password.length < 6}
          className={btnPrimary}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <button type="button" onClick={() => switchTo('login')} className="font-bold text-brand-400 transition-colors hover:text-brand-300">
          Login
        </button>
      </p>
      <p className="mt-4 text-center text-xs text-muted/70">
        18+ Only. By registering you agree to our Terms &amp; Conditions.
      </p>
    </ModalShell>
  );
}

export function Theme1AuthModals() {
  const { mode, open, close } = useAuthModal();
  if (mode === 'login') return <LoginModal onClose={close} switchTo={open} />;
  if (mode === 'register') return <RegisterModal onClose={close} switchTo={open} />;
  return null;
}
