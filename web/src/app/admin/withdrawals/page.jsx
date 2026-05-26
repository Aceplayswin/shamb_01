'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('/api/v1/admin/withdrawals/pending').then(setItems).catch(() => {});
  }, []);

  const approve = async (id) => {
    await api(`/api/v1/admin/withdrawals/${id}/approve`, { method: 'POST' });
    setItems((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-surface-900 p-6">
      <Link href="/admin" className="text-sm text-brand-400 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">Pending Withdrawals</h1>
      <div className="mt-6 space-y-3">
        {items.map((w) => (
          <div key={w.id} className="card-glass flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-white">{w.full_name ?? w.username}</p>
              <p className="text-sm text-slate-400">
                ₹{parseFloat(w.amount).toLocaleString('en-IN')} · {w.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => approve(w.id)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Approve
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500">No pending withdrawals</p>
        )}
      </div>
    </div>
  );
}
