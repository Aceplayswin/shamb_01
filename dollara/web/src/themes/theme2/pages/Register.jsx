'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gift, Lock, Phone, User } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { PasswordInput } from '@/components/PasswordInput';
import { T2FormPage, t2Input, t2BtnPrimary } from '../components/ui';

export default function Theme2Register() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  useGuestOnly('/onboarding');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async () => {
    setLoading(true); setError('');
    try {
      const result = await api('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ phone, fullName, password, referralCode: referralCode.trim() || undefined }) });
      setAuth({ token: result.token, userId: result.userId, username: result.username });
      router.push('/onboarding');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <T2FormPage title="Create account" subtitle="Instant access. KYC required before first withdrawal.">
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

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
        <Link href="/login" className="font-bold text-amber-400 hover:text-amber-300">Login</Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-500">18+ Only. By registering you agree to our Terms &amp; Conditions.</p>
    </T2FormPage>
  );
}
