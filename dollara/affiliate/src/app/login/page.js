'use client';

import { useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthShell, { inputClasses, labelClasses, primaryBtn, Spinner } from './_components/AuthShell';



export default function LoginPage() {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);



  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);



    // Simulate API auth check — replace with real API call in Phase 2

    setTimeout(() => {

      setLoading(false);

      // After success, redirect to 2FA verification

      window.location.href = '/login/2fa';
    }, 1200);

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
            <span>Remember me</span>
          </label>



          {/* Submit */}


          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? <Spinner /> : <span>Sign In</span>}
          </button>
        </form>



        {/* Footer link */}

        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Don't have a partner account?{' '}
          <Link href="/apply" className="font-bold text-brand-600 hover:text-brand-800 transition-colors">
            Apply Now
          </Link>
        </div>

      </div>
    </AuthShell>
  );
}
