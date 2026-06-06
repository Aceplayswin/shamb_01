'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Swal from 'sweetalert2';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      Swal.fire({
        title: 'Success!',
        text: 'You have successfully logged in.',
        icon: 'success',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#ff9800',
        timer: 1500,
        showConfirmButton: false,
      });
      setAuth({
        token: result.token,
        userId: result.demoId,
        username: result.demoId,
        isDemo: true,
      });
      router.push('/');
    } catch (err) {
      Swal.fire({
        title: 'Login failed',
        text: err instanceof Error ? err.message : 'Could not start demo session',
        icon: 'error',
        background: '#1a1a1a',
        color: '#fff',
        confirmButtonColor: '#ff9800',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-md flex-1 px-4 py-12">
        <form onSubmit={submit} className="bg-surface-800 border border-surface-700 p-8 rounded-xl">
          <h1 className="text-2xl font-bold text-white mb-2">Login</h1>
          <p className="text-slate-400 text-sm mb-6">Enter any details to login (Static Demo).</p>
          
          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-surface-600 bg-surface-900 px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-lg border border-surface-600 bg-surface-900 px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-brand-500 hover:bg-brand-400 transition-colors py-3 font-bold text-surface-900"
          >
            {loading ? 'Logging in...' : 'LOG IN'}
          </button>
          <p className="mt-6 text-center text-sm text-slate-500 font-bold uppercase tracking-wide">
            New user? <Link href="/register" className="text-brand-500 hover:text-brand-400">Register</Link>
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}