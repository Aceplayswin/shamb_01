'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import { Mail, Send, KeyRound } from 'lucide-react';

import AuthShell, { inputClasses, labelClasses, primaryBtn, Spinner } from '../_components/AuthShell';

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);



  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);




    // Simulate password reset email dispatch — wire to real API in Phase 2




    setTimeout(() => {
      setLoading(false);
      Swal.fire({
        title: 'Reset Link Sent!',
        text: 'If that email is registered, you will receive password reset instructions shortly.',
        icon: 'success',
        background: '#FFFFFF',
        color: '#0F172A',
        confirmButtonColor: '#E2B13C',
      }).then(() => {
        window.location.href = '/login';
      });
    }, 1000);
  };




  return (
    <AuthShell backHref="/login" backLabel="Back to Login">
      <div className="animate-fade-up">

        {/* Icon + title */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 
          flex items-center justify-center mx-auto mb-4">


            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Reset Password</h1>

          <p className="text-xs text-slate-500 mt-2">

            Enter your registered email and we'll send you a secure recovery link

          </p>
        </div>


        {/* Form */}


        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className={labelClasses}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="alex@partner.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Recovery Link</span>
              </>
            )}
          </button>

        </form>

        



        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <a href="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            Back to Login
          </a>
        </div>



      </div>
    </AuthShell>
  );
}
