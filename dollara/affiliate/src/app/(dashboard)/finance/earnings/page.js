'use client';

import { useState, useMemo } from 'react';
import { Download, TrendingUp, DollarSign, Wallet, Percent } from 'lucide-react';
import { mockEarnings } from '../../../../lib/mockData';
import EarningsFilters from './_components/EarningsFilters';
import EarningsTable from './_components/EarningsTable';
import StatementsModal from './_components/StatementsModal';

export default function EarningsPage() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter items
  const filtered = useMemo(() => {
    let list = mockEarnings;

    if (typeFilter !== 'All') {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (search.trim()) {
      list = list.filter((e) =>
        e.period.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.type.toLowerCase().includes(search.toLowerCase())
      );
    }

    return list;
  }, [typeFilter, statusFilter, search]);

  // Totals calculations
  const totalPaid = mockEarnings.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = mockEarnings.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const totalPending = mockEarnings.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  const cards = [
    { label: 'Paid Earnings',   value: `$${totalPaid.toLocaleString()}`,     icon: Wallet,     accent: 'text-brand-600 dark:text-brand-400' },
    { label: 'Approved Period', value: `$${totalApproved.toLocaleString()}`, icon: TrendingUp,  accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending Period',  value: `$${totalPending.toLocaleString()}`,  icon: DollarSign,  accent: 'text-amber-500 dark:text-amber-400' },
    { label: 'Conversion Base', value: '45% Rev Share',                       icon: Percent,    accent: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Earnings & Commission Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review detailed weekly breakdowns of CPA, Revenue Share, and Override rewards.
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
        >
          <Download className="w-4 h-4" /> Download Statement
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 transition-colors duration-300 hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`w-4 h-4 ${accent}`} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <EarningsFilters
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Table */}
      <EarningsTable items={filtered} />

      {/* Download statement modal */}
      {showExportModal && (
        <StatementsModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
