'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';


export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await api('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      });
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
        body: JSON.stringify({ phone, otp, fullName }),
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
      <Header />
      <main className="mx-auto max-w-md flex-1 px-4 py-12">
        <div className="card-glass p-8">
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Path A: OTP verification — instant access. KYC required before first withdrawal.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          {step === 'phone' && (
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
              />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="voice">Voice Call</option>
              </select>
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading || !phone || !fullName}
                className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-center text-2xl tracking-widest text-white"
              />
              <button
                type="button"
                onClick={register}
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Verify & Register'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-slate-400 hover:text-white"
              >
                Change phone number
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:underline">
              Login
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-600">
            18+ Only. By registering you agree to our Terms & Conditions.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
