'use client';

// The Login + Register split-panel modals for theme3. Which one shows is driven by
// the shell's auth-modal context. Data/auth wiring is the SHARED layer:
//   - Login  → useUnifiedLogin (player mode, phone + password). No OTP tab: the
//     backend has no login-by-OTP endpoint (OTP is registration-only).
//   - Register → phone → OTP → full name + password (same flow as theme2 Register).

import { useState } from 'react';
import { Lock, Phone, User as UserIcon, KeyRound, MessageCircle, Gift } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useUnifiedLogin } from '@/hooks/useUnifiedLogin';
import { useBranding } from '@/hooks/useBranding';
import { PasswordInput } from '@/components/PasswordInput';
import { AuthModal } from '../components/AuthModal';
import { t3Input, t3Select, t3BtnPrimary, T3Chip } from '../components/ui';
import { useAuthModal } from './authModalContext';

const iconLeft = 'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a94a8]';

function LoginModal() {
  const { close, open } = useAuthModal();
  const { identifier, setIdentifier, password, setPassword, loading, submit } = useUnifiedLogin();
  const branding = useBranding();
  const brandInitial = (branding.product_name || 'V').charAt(0).toUpperCase();

  const handleSubmit = async (e) => {
    await submit(e); // shows its own SweetAlert + redirects on success
  };

  return (
    <AuthModal
      onClose={close}
      brandInitial={brandInitial}
      sideTitle="Premium gaming access"
      sideText="Secure account login with live wallet updates and instant game launch."
      sideRows={[
        { label: 'Security', value: 'OTP' },
        { label: 'Wallet', value: 'Live' },
        { label: 'Access', value: '24/7' },
      ]}
    >
      <T3Chip>Secure Access</T3Chip>
      <h2 className="mt-4 font-display text-3xl font-black text-[#1b1726] sm:text-4xl">
        Welcome <span className="text-[#c79a3b]">Back</span>
      </h2>
      <p className="mt-2 text-sm text-[#6b6579]">Sign in to your account and start winning.</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Mobile</label>
          <div className="relative">
            <Phone className={iconLeft} />
            <input
              type="tel"
              inputMode="tel"
              placeholder="9999999999"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`${t3Input} pl-11`}
              autoComplete="tel"
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Password</label>
          <div className="relative">
            <Lock className={`${iconLeft} z-10`} />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${t3Input} pl-11 pr-11`}
              toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#9a94a8] transition hover:text-[#6b6579]"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className={`${t3BtnPrimary} w-full`}>
          {loading ? 'Signing in…' : 'Login Now →'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b6579]">
        Don&apos;t have an account yet?{' '}
        <button type="button" onClick={() => open('register')} className="font-bold text-[#c79a3b] hover:underline">
          Create Account
        </button>
      </p>
    </AuthModal>
  );
}

function RegisterModal() {
  const { close, open } = useAuthModal();
  const setAuth = useAuthStore((s) => s.setAuth);
  const branding = useBranding();
  const brandInitial = (branding.product_name || 'V').charAt(0).toUpperCase();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [channel, setChannel] = useState('sms');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    setDevOtp('');
    try {
      const res = await api('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      });
      if (res.otp) {
        setOtp(res.otp);
        setDevOtp(res.otp);
      }
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/v1/auth/register/otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, fullName, password, referralCode: referralCode.trim() || undefined }),
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
      brandInitial={brandInitial}
      sideTitle="Start with a cleaner setup"
      sideText="Register once, verify your mobile, and keep your bonus, wallet, and game access in one account."
      sideRows={[
        { label: 'Welcome', value: 'Bonus' },
        { label: 'Verification', value: 'OTP' },
        { label: 'Support', value: '24/7' },
      ]}
    >
      <T3Chip>New Player Bonus</T3Chip>
      <h2 className="mt-4 font-display text-3xl font-black text-[#1b1726] sm:text-4xl">
        Create <span className="text-[#c79a3b]">Account</span>
      </h2>
      <p className="mt-2 text-sm text-[#6b6579]">Join the lobby and unlock your welcome rewards.</p>

      {error && (
        <p className="mt-4 rounded-xl border border-[#e5484d]/25 bg-[#e5484d]/10 px-3 py-2 text-sm text-[#c0343a]">
          {error}
        </p>
      )}

      {step === 'phone' && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Full Name</label>
            <div className="relative">
              <UserIcon className={iconLeft} />
              <input
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`${t3Input} pl-11`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Mobile</label>
            <div className="relative">
              <Phone className={iconLeft} />
              <input
                type="tel"
                inputMode="tel"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${t3Input} pl-11`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Password</label>
            <div className="relative">
              <Lock className={`${iconLeft} z-10`} />
              <PasswordInput
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${t3Input} pl-11 pr-11`}
                toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#9a94a8] transition hover:text-[#6b6579]"
                minLength={6}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Channel</label>
            <div className="relative">
              <MessageCircle className={iconLeft} />
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${t3Select} pl-11`}>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="voice">Voice Call</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6b6579]">Referral code (optional)</label>
            <div className="relative">
              <Gift className={iconLeft} />
              <input type="text" placeholder="Enter code" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className={`${t3Input} pl-11 uppercase tracking-widest`} maxLength={20} />
            </div>
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading || !phone || !fullName || password.length < 6}
            className={`${t3BtnPrimary} w-full`}
          >
            {loading ? 'Sending…' : 'Get OTP'}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="mt-6 space-y-4">
          {devOtp && (
            <p className="rounded-xl border border-[#c79a3b]/30 bg-[#f3ead4] px-3 py-2 text-center text-sm text-[#9a7a24]">
              Dev OTP: <span className="font-mono font-bold tracking-widest">{devOtp}</span>
            </p>
          )}
          <div className="relative">
            <KeyRound className={iconLeft} />
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={`${t3Input} pl-11 text-center text-2xl tracking-[0.5em]`}
            />
          </div>
          <button type="button" onClick={register} disabled={loading || otp.length !== 6} className={`${t3BtnPrimary} w-full`}>
            {loading ? 'Creating account…' : 'Verify & Register'}
          </button>
          <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-[#6b6579] hover:text-[#1b1726]">
            Change mobile number
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-[#6b6579]">
        Already registered?{' '}
        <button type="button" onClick={() => open('login')} className="font-bold text-[#c79a3b] hover:underline">
          Login Here
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-[#9a94a8]">
        18+ Only. By registering you agree to our Terms &amp; Conditions.
      </p>
    </AuthModal>
  );
}

export function Theme3AuthModals() {
  const { mode } = useAuthModal();
  if (mode === 'login') return <LoginModal />;
  if (mode === 'register') return <RegisterModal />;
  return null;
}
