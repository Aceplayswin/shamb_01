'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, TrendingUp, DollarSign, Wallet, Percent, Receipt } from 'lucide-react';
import { useAffiliate } from '../../../../context/AffiliateContext';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';
import { CardSkeleton, DataState } from '../../../../components/ui/DataState';
import { Pagination } from '../../../../components/ui/Pagination';
import { inr } from '../../../../lib/format';
import EarningsFilters from './_components/EarningsFilters';
import EarningsTable from './_components/EarningsTable';
import StatementsModal from './_components/StatementsModal';

const PAGE_SIZE = 25;

export default function EarningsPage() {
  const { me } = useAffiliate();
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (typeFilter !== 'All') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (applied) params.set('q', applied);
    return params.toString();
  }, [typeFilter, statusFilter, applied, page]);

  const { data, loading, error, reload } = useAffiliateData(
    `/api/v1/affiliate/earnings?${query}`,
    [query],
  );

  const items = data?.records ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;

  // Totals span the whole ledger rather than the current page — these cards are
  // about the account, not about what happens to be on screen.
  const cards = [
    { label: 'Paid Earnings', value: inr(summary?.paid ?? 0), icon: Wallet, accent: 'text-brand-600 dark:text-brand-400' },
    { label: 'Approved', value: inr(summary?.approved ?? 0), icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending', value: inr(summary?.pending ?? 0), icon: DollarSign, accent: 'text-amber-500 dark:text-amber-400' },
    {
      label: 'Commission Basis',
      // The affiliate's real terms, not a fixed "45% Rev Share".
      value: summary?.commission_type === 'cpa'
        ? `${inr(me?.cpa_amount ?? 0)} CPA`
        : `${summary?.commission_rate ?? 0}% Rev Share`,
      icon: Percent,
      accent: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const onFilterChange = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Earnings & Commission Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Every entry behind your balance — revenue share, CPA bounties and network overrides.
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
      {loading && !data ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 transition-colors duration-300 hover:scale-[1.01]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${accent}`} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <EarningsFilters
        typeFilter={typeFilter}
        onTypeChange={onFilterChange(setTypeFilter)}
        statusFilter={statusFilter}
        onStatusChange={onFilterChange(setStatusFilter)}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Table */}
      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!items.length}
        emptyTitle="No commission entries yet"
        emptyHint="Entries appear after the nightly run credits activity from your referred players."
        emptyIcon={Receipt}
      >
        <EarningsTable items={items} />

        <Pagination
          page={page}
          total={total}
          perPage={PAGE_SIZE}
          onPage={setPage}
          noun="entry"
        />
      </DataState>

      {/* Download statement modal */}
      {showExportModal && (
        <StatementsModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
