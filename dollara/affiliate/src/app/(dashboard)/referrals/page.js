'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { CardSkeleton, DataState } from '../../../components/ui/DataState';
import { Pagination } from '../../../components/ui/Pagination';
import { inr, num } from '../../../lib/format';
import StatusFilter from './_components/StatusFilter';
import ReferralTable from './_components/ReferralTable';
import ReferralDetailPanel from './_components/ReferralDetailPanel';

const PAGE_SIZE = 25;

export default function ReferralsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  // Search is debounced into `applied` so typing does not fire a request per
  // keystroke — the filtering is server-side now, not a client array scan.
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

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
      status: statusFilter,
    });
    if (applied) params.set('q', applied);
    return params.toString();
  }, [statusFilter, applied, page]);

  const { data, loading, error, reload } = useAffiliateData(
    `/api/v1/affiliate/referrals?${query}`,
    [query],
  );

  const players = data?.records ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;

  // Counts and totals describe the whole account, not the visible page, so the
  // cards do not change meaning when you paginate or filter.
  const counts = summary?.counts ?? { all: 0, active: 0, dormant: 0, blocked: 0 };

  const summaryCards = [
    {
      label: 'Total Players',
      value: num(summary?.total_players ?? 0),
      icon: Users,
      accent: 'text-brand-600 dark:text-brand-400',
    },
    {
      label: 'Active Players',
      value: num(counts.active),
      icon: UserCheck,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'FTD Rate',
      value: `${summary?.ftd_rate ?? 0}%`,
      icon: TrendingUp,
      accent: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Total Commission',
      value: inr(summary?.total_commission ?? 0),
      icon: DollarSign,
      accent: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const handleStatusChange = (next) => {
    setStatusFilter(next);
    setPage(0);
  };

  return (
    <>
      <div className="space-y-6 animate-fade-up">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            My Referrals
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all referred players, their deposits, and commission earned.
          </p>
        </div>

        {/* Summary stat cards */}
        {loading && !data ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryCards.map(({ label, value, icon: Icon, accent }) => (
              <div
                key={label}
                className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none p-4 transition-colors duration-300 hover:scale-[1.01]"
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

        {/* Status filter */}
        <StatusFilter current={statusFilter} onChange={handleStatusChange} counts={counts} />

        {/* Table */}
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!players.length}
          emptyTitle={applied || statusFilter !== 'all'
            ? 'No players match these filters'
            : 'No referred players yet'}
          emptyHint={applied || statusFilter !== 'all'
            ? 'Try clearing the search or switching the status filter.'
            : 'Share a tracking link — players who sign up through it appear here.'}
          emptyIcon={Users}
        >
          <ReferralTable
            players={players}
            search={search}
            onSearchChange={setSearch}
            onSelect={(player) => setSelectedId(player.id)}
          />

          <Pagination
            page={page}
            total={total}
            perPage={PAGE_SIZE}
            onPage={setPage}
            noun="player"
          />
        </DataState>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <ReferralDetailPanel referralId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
