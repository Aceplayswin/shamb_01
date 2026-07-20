'use client';

import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

// Same category set the games catalog uses, so the tabs line up with how games
// are classified elsewhere in the admin.
const CATEGORIES = ['slots', 'live_casino', 'sports', 'lottery', 'ai_games', 'fantasy', 'virtual_sports'];

const catLabel = (c) => c.replace(/_/g, ' ');

export default function AdminBetsPage() {
  const { data: bets, loading } = useAdminData('/api/v1/admin/bets?limit=200');
  // Category tab currently in view — 'all' shows every bet.
  const [activeCategory, setActiveCategory] = useState('all');

  // Per-category bet counts drive the badge on each tab. Only categories that
  // actually have bets get a tab, so the bar reflects real activity.
  const countByCategory = useMemo(() => {
    const counts = {};
    for (const b of bets ?? []) {
      const c = b.game_category;
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [bets]);

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: bets?.length ?? 0 },
      // Always list every category, even ones with no bets yet — a zero count
      // just shows the tab as empty rather than hiding it.
      ...CATEGORIES.map((c) => ({
        key: c,
        label: catLabel(c),
        count: countByCategory[c] ?? 0,
      })),
    ],
    [bets, countByCategory],
  );

  const visibleBets = useMemo(
    () => (activeCategory === 'all' ? bets : (bets ?? []).filter((b) => b.game_category === activeCategory)),
    [bets, activeCategory],
  );

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
    {
      key: 'username',
      label: 'Player',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.full_name || r.username}</p>
          <p className="text-xs text-slate-500">{r.username}</p>
        </div>
      ),
    },
    { key: 'game_name', label: 'Game', render: (r) => r.game_name || '—' },
    {
      key: 'game_category',
      label: 'Category',
      render: (r) => <span className="capitalize text-slate-300">{r.game_category ? catLabel(r.game_category) : '—'}</span>,
    },
    { key: 'bet_amount', label: 'Stake', render: (r) => inr(r.bet_amount) },
    {
      key: 'payout',
      label: 'Won',
      render: (r) => <span className={r.payout > 0 ? 'font-semibold text-emerald-400' : 'text-slate-400'}>{inr(r.payout)}</span>,
    },
    {
      key: 'wallet_balance',
      label: 'Total Amount',
      // Wallet balance the player had available right after this bet settled,
      // so money on each account can be tracked over time.
      render: (r) => (
        <span className="font-semibold text-white">
          {r.wallet_balance != null ? inr(r.wallet_balance) : '—'}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <AdminShell title="Bets" subtitle="Player wagering activity">
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {tabs.map((t) => {
          const active = activeCategory === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveCategory(t.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  active ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        rows={visibleBets}
        loading={loading}
        searchable
        searchKeys={['username', 'game_name']}
        searchPlaceholder="Search bets…"
        pageSize={20}
        emptyIcon={Dices}
        emptyMessage="No bets recorded"
      />
    </AdminShell>
  );
}
