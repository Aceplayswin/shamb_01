'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, KeyRound, Lock, MessageCircle, Phone, User } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { PasswordInput } from '@/components/PasswordInput';

const inputClass =
  'w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-4 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none';

const passwordClass =
  'w-full rounded-xl border border-hairline/10 bg-panel/60 py-3 pl-11 pr-11 text-app-fg placeholder:text-muted/70 transition-colors focus:border-brand-400/50 focus:outline-none';

export default function Theme1Register() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  useGuestOnly('/onboarding');
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
      router.push('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="mx-auto max-w-md flex-1 px-4 py-12">
        <div className="ring-grad relative overflow-hidden rounded-3xl bg-panel-strong bg-mesh-amber p-8 sm:p-10">
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />

          <div className="relative">
            <h1 className="font-display text-2xl font-black text-app-fg sm:text-3xl">Create account</h1>
            <p className="mt-2 text-sm text-muted">
              Path A: OTP verification — instant access. KYC required before first withdrawal.
            </p>

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {step === 'phone' && (
              <div className="mt-8 space-y-4">
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
                  <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="voice">Voice Call</option>
                  </select>
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
                  onClick={sendOtp}
                  disabled={loading || !phone || !fullName || password.length < 6}
                  className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send OTP'}
                </button>
              </div>
            )}

            {step === 'otp' && (
              <div className="mt-8 space-y-4">
                {devOtp && (
                  <p className="rounded-xl border border-brand-400/30 bg-brand-500/10 px-3 py-2 text-center text-sm text-brand-300">
                    Dev OTP: <span className="font-mono font-bold tracking-widest">{devOtp}</span>
                  </p>
                )}
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  />
                </div>
                <button
                  type="button"
                  onClick={register}
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
                >
                  {loading ? 'Creating account…' : 'Verify & Register'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-sm text-muted transition-colors hover:text-app-fg"
                >
                  Change phone number
                </button>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-brand-400 transition-colors hover:text-brand-300">
                Login
              </Link>
            </p>
            <p className="mt-4 text-center text-xs text-muted/70">
              18+ Only. By registering you agree to our Terms &amp; Conditions.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
