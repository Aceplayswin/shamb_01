'use client';

// Standalone admin sign-in. Because the console is now its own app (its own
// origin), it can no longer defer to the player web app's unified login — the
// admin_token must be minted and stored here. This form posts username/password
// to /api/v1/admin/auth/login (via adminLogin) and lands on the dashboard.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import { adminLogin, getAdminToken } from '@/services/adminApi';
import { useBranding } from '@/hooks/useBranding';

const SWAL_BASE = { confirmButtonColor: '#4f46e5', background: '#0d1420', color: '#e2e8f0' };

export default function AdminLoginPage() {
  const router = useRouter();
  const branding = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Already signed in → skip the form.
  useEffect(() => {
    if (getAdminToken()) {
      router.replace('/');
    } else {
      setChecking(false);
    }
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await adminLogin(username.trim(), password);
      await Swal.fire({
        title: 'Admin verified',
        text: 'Redirecting to the console…',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
        ...SWAL_BASE,
      });
      router.replace('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text: err instanceof Error ? err.message : 'Invalid username or password',
        icon: 'error',
        ...SWAL_BASE,
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt="" className="h-12 w-auto" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </span>
          )}
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              {branding?.product_name ? `${branding.product_name} Console` : 'Admin Console'}
            </h1>
            <p className="mt-1 text-xs text-slate-500">Sign in with your staff credentials</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-card"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">Username</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-indigo-500">
              <UserIcon className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-transparent py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                placeholder="Username"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">Password</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 focus-within:border-indigo-500">
              <Lock className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 text-slate-500 transition hover:text-slate-300"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in to console'}
          </button>
        </form>
      </div>
    </div>
  );
}
