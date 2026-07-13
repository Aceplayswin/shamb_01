'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Box, Loader2, Plus } from 'lucide-react';
import { listProducts } from '@/services/api';
import DashboardLayout, { useDashboard } from './components/DashboardLayout';

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function OverviewContent() {
  const { refreshKey, openAddModal } = useDashboard();
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const activeCount   = products.filter((p) => p.status === 'active').length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Platform at a glance</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Total Products" value={products.length} icon={Box}      accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
        <StatCard label="Active"         value={activeCount}       icon={Activity} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
        <StatCard label="Inactive"       value={inactiveCount}     icon={Box}      accent="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">Recent Products</h2>
          <a href="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            View all →
          </a>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
              <Box className="h-6 w-6 text-gray-400" />
            </span>
            <p className="text-sm text-gray-400">No products yet.</p>
            <button onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Add your first product
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {products.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-400">ID #{p.id}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <DashboardLayout>
      <OverviewContent />
    </DashboardLayout>
  );
}
