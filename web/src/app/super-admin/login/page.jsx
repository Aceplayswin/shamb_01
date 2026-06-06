'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { superAdminLogin, getSuperAdminToken } from '@/services/superAdminApi';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSuperAdminToken()) router.replace('/super-admin');
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await superAdminLogin(username, password);
      router.push('/super-admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-900 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-emerald-500 shadow-glow">
            <ShieldCheck className="h-7 w-7 text-surface-950" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-white">Platform Console</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Super Admin
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong space-y-4 rounded-2xl border border-white/10 bg-surface-800/60 p-7 shadow-card">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">Username</span>
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-950/60 px-3">
              <UserIcon className="h-4 w-4 text-slate-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none"
                placeholder="superadmin"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-400">Password</span>
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-950/60 px-3">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none"
                placeholder="••••••••"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-400 to-emerald-500 py-2.5 text-sm font-bold text-surface-950 transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
