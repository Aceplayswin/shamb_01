'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import AuthShell, { primaryBtn, Spinner } from '../_components/AuthShell';
import { affiliateVerify2fa, getChallengeToken } from '../../../services/affiliateApi';

export default function TwoFactorPage() {

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();



  // One ref per digit box so we can auto-focus forward/backward

  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];



  // Focus the first box as soon as the page loads

  useEffect(() => {
    // Landing here without a live challenge means the password step was never
    // completed (or the tab was reopened), so there is nothing to verify.
    if (!getChallengeToken()) {
      router.replace('/login');
      return;
    }
    refs[0].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleChange = (index, value) => {
    if (isNaN(value)) return; // digits only

    // Pasting the whole code should fill every box, not just the one focused.
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length) {
        const filled = ['', '', '', '', '', ''];
        digits.forEach((d, i) => {
          filled[i] = d;
        });
        setOtp(filled);
        refs[Math.min(digits.length, 5)].current?.focus();
        return;
      }
    }

    const next = [...otp];
    next[index] = value.slice(-1); // keep only the last char typed
    setOtp(next);
    if (value && index < 5) refs[index + 1].current.focus();
  };



  const handleKeyDown = (index, e) => {


    if (e.key === 'Backspace' && !otp[index] && index > 0) {


      refs[index - 1].current.focus();


       }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await affiliateVerify2fa(code);
      router.replace(result.onboardingComplete === false ? '/onboarding' : '/dashboard');
    } catch (err) {
      // A wrong code is a normal event, not an exception worth a modal. Clear
      // the boxes and refocus so retrying is one action.
      setError(err.message || 'That code is not valid.');
      setOtp(['', '', '', '', '', '']);
      refs[0].current?.focus();
      setLoading(false);
    }
  };


  return (
    <AuthShell backHref="/login" backLabel="Back to Login">
      <div className="animate-fade-up">



        {/* Icon + title */}

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Security Check</h1>
          <p className="text-xs text-slate-500 mt-2">
            Open your authenticator app and enter the current 6-digit code
          </p>
        </div>



        {/* OTP digit boxes */}

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2 max-w-xs mx-auto">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={refs[idx]}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl border border-slate-200 text-center text-xl font-bold bg-white text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-colors"
              />
            ))}
          </div>



          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <span>Verify Code</span>}
          </button>
        </form>



        {/* Footer actions */}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs">
          <a href="/login" className="font-semibold text-slate-500 transition-colors hover:text-slate-800">
            Back to Login
          </a>
          <p className="mt-3 text-slate-400">
            Codes refresh every 30 seconds in your authenticator app. Lost access to
            your device? Contact support to recover your account.
          </p>
        </div>

        

      </div>
    </AuthShell>
  );
}
