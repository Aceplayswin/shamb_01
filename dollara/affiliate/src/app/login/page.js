'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthShell, { inputClasses, labelClasses, primaryBtn, Spinner } from './_components/AuthShell';
import { affiliateLogin, getAffiliateToken } from '../../services/affiliateApi';



export default function LoginPage() {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const router = useRouter();

  // Already signed in — skip the form rather than making them log in twice.
  useEffect(() => {
    if (getAffiliateToken()) router.replace('/dashboard');
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const result = await affiliateLogin(email.trim(), password);

      // Three possible destinations: the second factor, onboarding, or the
      // console. Which one depends entirely on the server's answer — the client
      // never assumes.
      if (result.twoFactorRequired) {
        router.push('/login/2fa');
        return;
      }
      router.replace(result.onboardingComplete === false ? '/onboarding' : '/dashboard');
    } catch (err) {
      // Shown inline rather than in a modal: the message usually says what to
      // fix ("still under review", "suspended"), and a dialog buries that.
      setError(err.message || 'Could not sign you in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthShell backHref="/" backLabel="Back to Home">
      <div className="animate-fade-up">



        {/* Title */}


        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">Partner Sign In</h1>
          <p className="text-xs text-slate-500 mt-2">Enter your credentials to access the affiliate suite</p>
        </div>



        {/* Form */}

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">



          {/* Email */}


          <div>

            <label className={labelClasses}>Email Address</label>


            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="login-email"
                type="email"
                required
                placeholder="alex@partner.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>



          {/* Password */}


          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={labelClasses} style={{ marginBottom: 0 }}>Password</label>

              <Link
                href="/login/forgot"
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
              >
                Forgot Password?
              </Link>



              </div>


            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
              />


              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>




          {/* Remember me */}

          <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-500 h-4 w-4"
            />
            <span>Keep me signed in on this device</span>
          </label>



          {/* Submit */}


          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <span>Sign In</span>}
          </button>
        </form>



        {/* Footer link */}

        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Don&apos;t have a partner account?{' '}
          <Link href="/apply" className="font-bold text-brand-600 hover:text-brand-800 transition-colors">
            Apply Now
          </Link>
        </div>

      </div>
    </AuthShell>
  );
}
