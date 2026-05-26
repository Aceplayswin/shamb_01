'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function LoginScreen({ onLogin }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900">
      <div className="card-glass w-full max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <p className="mt-2 text-sm text-slate-400">DOLLARA Backend Management</p>
        <button
          type="button"
          onClick={onLogin}
          className="mt-6 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900"
        >
          Login as Super Admin
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  const login = async () => {
    const res = await api('/api/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'superadmin', password: 'Admin@123' }),
    });
    localStorage.setItem('token', res.token);
    setLoggedIn(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      setLoggedIn(true);
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    if (loggedIn) {
      api('/api/v1/admin/dashboard')
        .then(setStats)
        .catch(() => {});
    }
  }, [loggedIn]);

  if (!checked) return null;
  if (!loggedIn) return <LoginScreen onLogin={login} />;

  const cards = stats
    ? [
        { label: 'Active Players', value: stats.activePlayers },
        { label: 'Signups Today', value: stats.signupsToday },
        { label: 'Total Users', value: stats.totalUsers },
        {
          label: 'Deposits Today',
          value: `₹${stats.depositsToday.amount.toLocaleString('en-IN')}`,
        },
        {
          label: 'Withdrawals Today',
          value: `₹${stats.withdrawalsToday.amount.toLocaleString('en-IN')}`,
        },
        { label: 'Pending Withdrawals', value: stats.withdrawalsToday.pending },
        {
          label: 'Total Liability',
          value: `₹${stats.totalLiability.toLocaleString('en-IN')}`,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-surface-900 p-6">
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-glass p-4">
            <p className="text-sm text-slate-400">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link href="/admin/withdrawals" className="text-brand-400 hover:underline">
          Pending Withdrawals →
        </Link>
      </div>
    </div>
  );
}
