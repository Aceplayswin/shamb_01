'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, MessageCircle, Phone, User } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { T2FormPage, t2Input, t2Select, t2BtnPrimary } from '../components/ui';

export default function Theme2Register() {
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
    setLoading(true); setError('');
    try {
      await api('/api/v1/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone, channel }) });
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const register = async () => {
    setLoading(true); setError('');
    try {
      const result = await api('/api/v1/auth/register/otp', { method: 'POST', body: JSON.stringify({ phone, otp, fullName }) });
      setAuth({ token: result.token, userId: result.userId, username: result.username });
      router.push('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <T2FormPage title="Create account" subtitle="OTP verification — instant access. KYC required before first withdrawal.">
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {step === 'phone' && (
        <div className="mt-8 space-y-4">
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${t2Input} pl-11`} />
          </div>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${t2Input} pl-11`} />
          </div>
          <div className="relative">
            <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${t2Select} pl-11`}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="voice">Voice Call</option>
            </select>
          </div>
          <button type="button" onClick={sendOtp} disabled={loading || !phone || !fullName} className={`${t2BtnPrimary} w-full`}>
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="mt-8 space-y-4">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Enter 6-digit OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className={`${t2Input} pl-11 text-center text-2xl tracking-[0.5em]`} />
          </div>
          <button type="button" onClick={register} disabled={loading || otp.length !== 6} className={`${t2BtnPrimary} w-full`}>
            {loading ? 'Creating account…' : 'Verify & Register'}
          </button>
          <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-slate-400 hover:text-white">
            Change phone number
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-amber-400 hover:text-amber-300">Login</Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-500">18+ Only. By registering you agree to our Terms &amp; Conditions.</p>
    </T2FormPage>
  );
}
