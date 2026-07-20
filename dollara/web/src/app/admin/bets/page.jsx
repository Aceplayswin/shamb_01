'use client';

import { Dices } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  TxReference,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';

// Same category set the games catalog uses, so the category filter lines up with
// how games are classified elsewhere in the admin.
const CATEGORIES = ['slots', 'live_casino', 'sports', 'lottery', 'ai_games', 'fantasy', 'virtual_sports'];

const catLabel = (c) => c.replace(/_/g, ' ');

export default function AdminBetsPage() {
  const { data: bets, loading } = useAdminData('/api/v1/admin/bets?limit=200');

  const columns = [
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
      filter: 'select',
      filterOptions: CATEGORIES.map((c) => ({ value: c, label: catLabel(c) })),
    },
    {
      key: 'reference',
      label: 'Reference',
      sortable: false,
      render: (r) => <TxReference reference={r.reference} />,
    },
    { key: 'bet_amount', label: 'Bet Amount', render: (r) => inr(r.bet_amount) },
    {
      key: 'status',
      label: 'Result',
      filter: 'select',
      filterLabel: 'Result',
      render: (r) => {
        if (r.status === 'pending') {
          return (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              Pending
            </span>
          );
        }
        const up = r.profit_loss >= 0;
        return (
          <span className={`font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
            {up ? '+' : '−'}
            {inr(Math.abs(r.profit_loss))}
          </span>
        );
      },
    },
    {
      key: 'wallet_balance',
      label: 'Wallet Amount',
      // Wallet balance the player had available right after this bet settled,
      // so money on each account can be tracked over time.
      render: (r) => (
        <span className="font-semibold text-white">
          {r.wallet_balance != null ? inr(r.wallet_balance) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      filter: 'date',
      render: (r) => {
        if (!r.created_at) return '—';
        const dt = new Date(r.created_at);
        return (
          <div className="whitespace-nowrap">
            <p className="text-slate-200">{dt.toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            <p className="text-xs text-slate-500">{dt.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</p>
          </div>
        );
      },
    },
  ];

  return (
    <AdminShell title="Bets" subtitle="Player wagering activity">
      <DataTable
        columns={columns}
        rows={bets}
        loading={loading}
        searchable
        searchKeys={['username', 'game_name']}
        searchPlaceholder="Search bets…"
        noun="bet"
        pageSize={20}
        emptyIcon={Dices}
        emptyMessage="No bets recorded"
        filterSubtitle="Combine category and status"
      />
    </AdminShell>
  );
}
