'use client';

import { Dices } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminBetsPage() {
  const { data: bets, loading } = useAdminData('/api/v1/admin/bets?limit=200');

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
    { key: 'username', label: 'User', render: (r) => <span className="font-medium text-white">{r.username}</span> },
    { key: 'game_name', label: 'Game', render: (r) => r.game_name || '—' },
    { key: 'bet_amount', label: 'Stake', render: (r) => inr(r.bet_amount) },
    { key: 'odds', label: 'Odds', render: (r) => (r.odds ? r.odds.toFixed(2) : '—') },
    {
      key: 'payout',
      label: 'Payout',
      render: (r) => <span className={r.payout > 0 ? 'font-semibold text-emerald-400' : 'text-slate-400'}>{inr(r.payout)}</span>,
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
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
        pageSize={20}
        emptyIcon={Dices}
        emptyMessage="No bets recorded"
      />
    </AdminShell>
  );
}
