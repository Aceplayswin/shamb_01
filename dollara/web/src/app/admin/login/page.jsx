'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, User as UserIcon, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { adminLogin, getAdminToken } from '@/services/adminApi';
import { useBranding } from '@/hooks/useBranding';
import { PasswordInput } from '@/components/PasswordInput';

export default function AdminLoginPage() {
  const router = useRouter();
  const branding = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) router.replace('/admin');
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(username, password);
      router.push('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-900 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="relative grid h-14 w-14 place-items-center">
            <span
              className="absolute inset-0 rounded-2xl opacity-60 blur-md"
              style={{ backgroundColor: branding.theme_color }}
            />
            <span
              className="relative grid h-14 w-14 place-items-center rounded-2xl shadow-glow"
              style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
            >
              <Sparkles className="h-7 w-7 text-surface-950" strokeWidth={2.5} />
            </span>
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-white">
            {branding.product_name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Console
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong space-y-4 p-7 shadow-card">
          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Username
            </span>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-950/60 py-3 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                placeholder="superadmin"
                required
                autoComplete="username"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Password
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-950/60 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 transition focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
                toggleClassName="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 py-3 font-bold text-surface-950 shadow-glow transition hover:from-brand-300 hover:to-brand-500 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-600">
          Protected area · Authorized personnel only
        </p>
      </div>
    </div>
  );
}
