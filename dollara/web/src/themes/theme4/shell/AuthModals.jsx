'use client';

// The Login + Register modals for theme4. Which one shows is driven by the
// shell's auth-modal context. Data/auth wiring is the SHARED layer:
//   - Login  → useUnifiedLogin (player mode, phone + password).
//   - Register → full name + phone + password. Direct sign-up, no verification step.

import { useState } from 'react';
import { Lock, Phone, User as UserIcon, Gift } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { useBranding } from '@/hooks/useBranding';
import { PasswordInput } from '@/components/PasswordInput';
import { AuthModal } from '../components/AuthModal';
import { t4Input, t4BtnPrimary } from '../components/ui';
import { useAuthModal } from './authModalContext';

const iconLeft = 'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa0a4]';

function LoginModal() {
  const { close, open } = useAuthModal();
  const { identifier, setIdentifier, password, setPassword, loading, submit } = useUnifiedLogin();
  const branding = useBranding();
  const brandName = branding.product_name || 'DOLLARA';

  const handleSubmit = async (e) => {
    await submit(e); // shows its own SweetAlert + redirects on success
  };

  return (
    <AuthModal
      onClose={close}
      brandInitial={brandName.charAt(0).toUpperCase()}
      brandName={brandName}
      headline="Member Login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Mobile</label>
          <div className="relative">
            <Phone className={iconLeft} />
            <input
              type="tel"
              inputMode="tel"
              placeholder="9999999999"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`${t4Input} pl-11`}
              autoComplete="tel"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Password</label>
          <div className="relative">
            <Lock className={`${iconLeft} z-10`} />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${t4Input} pl-11 pr-11`}
              toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#8aa0a4] transition hover:text-[#5d7378]"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className={`${t4BtnPrimary} w-full`}>
          {loading ? 'Signing in…' : 'Log In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#5d7378]">
        Don&apos;t have an account yet?{' '}
        <button type="button" onClick={() => open('register')} className="font-bold text-[#0e7480] hover:underline">
          Create Account
        </button>
      </p>
      <p className="mt-3 text-center text-[0.65rem] text-[#8aa0a4]">
        18+ Only. Please play responsibly.
      </p>
    </AuthModal>
  );
}

function RegisterModal() {
  const { close, open } = useAuthModal();
  const setAuth = useAuthStore((s) => s.setAuth);
  const branding = useBranding();
  const brandName = branding.product_name || 'DOLLARA';

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, fullName, password, referralCode: referralCode.trim() || undefined }),
      });
      setAuth({ token: result.token, userId: result.userId, username: result.username });
      close();
      window.location.assign('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthModal
      onClose={close}
      brandInitial={brandName.charAt(0).toUpperCase()}
      brandName={brandName}
      headline="Create Account"
    >
      {error && (
        <p className="mb-4 rounded border border-[#e5342c]/25 bg-[#e5342c]/10 px-3 py-2 text-sm text-[#c0342c]">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Full Name</label>
          <div className="relative">
            <UserIcon className={iconLeft} />
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`${t4Input} pl-11`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Mobile</label>
          <div className="relative">
            <Phone className={iconLeft} />
            <input
              type="tel"
              inputMode="tel"
              placeholder="9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${t4Input} pl-11`}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Password</label>
          <div className="relative">
            <Lock className={`${iconLeft} z-10`} />
            <PasswordInput
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${t4Input} pl-11 pr-11`}
              toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#8aa0a4] transition hover:text-[#5d7378]"
              minLength={6}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#5d7378]">Referral code (optional)</label>
          <div className="relative">
            <Gift className={iconLeft} />
            <input type="text" placeholder="Enter code" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className={`${t4Input} pl-11 uppercase tracking-widest`} maxLength={20} />
          </div>
        </div>
        <button
          type="button"
          onClick={register}
          disabled={loading || !phone || !fullName || password.length < 6}
          className={`${t4BtnPrimary} w-full`}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-[#5d7378]">
        Already registered?{' '}
        <button type="button" onClick={() => open('login')} className="font-bold text-[#0e7480] hover:underline">
          Login Here
        </button>
      </p>
      <p className="mt-3 text-center text-[0.65rem] text-[#8aa0a4]">
        18+ Only. By registering you agree to our Terms &amp; Conditions.
      </p>
    </AuthModal>
  );
}

export function Theme4AuthModals() {
  const { mode } = useAuthModal();
  if (mode === 'login') return <LoginModal />;
  if (mode === 'register') return <RegisterModal />;
  return null;
}
