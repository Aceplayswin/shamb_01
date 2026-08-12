'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, Send, KeyRound } from 'lucide-react';

import AuthShell, { inputClasses, labelClasses, primaryBtn, Spinner } from '../_components/AuthShell';
import { requestPasswordReset } from '../../../services/affiliateApi';

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
    } catch {
      // Swallowed on purpose. The endpoint always reports success so that this
      // form cannot be used to discover which addresses are registered, and
      // showing a network error here would leak the same thing by accident.
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell backHref="/login" backLabel="Back to Login">
        <div className="animate-fade-up text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">
            Check your inbox
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-500">
            If <span className="font-semibold text-slate-700">{email}</span> is
            registered as a partner account, reset instructions are on their way.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className={`${primaryBtn} mt-8`}
          >
            Back to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

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

            Enter your registered email and we&apos;ll send you a secure recovery link

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
