'use client';

import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { ShieldCheck } from 'lucide-react';
import AuthShell, { primaryBtn, Spinner } from '../_components/AuthShell';

export default function TwoFactorPage() {

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);



  // One ref per digit box so we can auto-focus forward/backward

  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];



  // Focus the first box as soon as the page loads

  useEffect(() => {

    refs[0].current?.focus();

  },
   []);



  const handleChange = (index, value) => {

    if (isNaN(value)) return;          // digits only

    const next = [...otp];

    next[index] = value.slice(-1);       // keep only the last char typed

    setOtp(next);

    if (value && index < 5) refs[index + 1].current.focus();

  };



  const handleKeyDown = (index, e) => {


    if (e.key === 'Backspace' && !otp[index] && index > 0) {


      refs[index - 1].current.focus();


       }
  };



  const handleSubmit = (e) => {


    e.preventDefault();

    if (otp.join('').length < 6) {
      alert('Please enter all 6 digits.');
      return;
    }

    setLoading(true);



    // Simulate token check — wire up to real endpoint in Phase 2

    setTimeout(() => {
      setLoading(false);
      Swal.fire({
        title: 'Authentication Success!',
        text: 'Access granted. Redirecting to your dashboard...',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#FFFFFF',
        color: '#0F172A',
      }).then(() => {
        window.location.href = '/dashboard';
      });
    }, 1000);
  };



  const handleResend = () => {
    Swal.fire({
      text: 'A new verification code has been dispatched.',
      icon: 'info',
      timer: 1500,
      showConfirmButton: false,
      background: '#FFFFFF',
      color: '#0F172A',
    });
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
            Enter the 6-digit authentication code sent to your device
          </p>
        </div>



        {/* OTP digit boxes */}

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

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
          <a href="/login" className="text-slate-500 hover:text-slate-800 transition-colors">
            Back to Login
          </a>
          <button
            type="button"
            onClick={handleResend}
            className="text-brand-600 hover:text-brand-800 transition-colors"
          >
            Resend Code
          </button>
        </div>

        

      </div>
    </AuthShell>
  );
}
