'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock, User as UserIcon, AlertCircle, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { superAdminLogin, getSuperAdminToken } from '@/services/api';
import { useTheme } from '../providers';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSuperAdminToken()) router.replace('/');
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await superAdminLogin(username, password);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">

      {/* ── Login Navbar ── */}
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
        {/* Logo — left */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-display text-sm font-extrabold leading-none text-gray-900 dark:text-white">
              Platform Console
            </p>
            <p className="text-[0.55rem] uppercase tracking-widest text-gray-400">Super Admin</p>
          </div>
        </div>

        {/* Theme toggle — right */}
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <><Sun className="h-3.5 w-3.5 text-amber-500" /> Light mode</>
          ) : (
            <><Moon className="h-3.5 w-3.5 text-indigo-500" /> Dark mode</>
          )}
        </button>
      </header>

      {/* ── Login Form ── */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Icon + title */}
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.5} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sign in to the super admin console
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Username
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900">
                  <UserIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-transparent py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                    placeholder="superadmin"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Password
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900">
                  <Lock className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
