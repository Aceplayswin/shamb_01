'use client';

// Admin bet history — every player's game sessions, with a round-by-round
// drill-down. A session still awaiting the provider's result reads Pending
// rather than being reported as a loss.

import { useEffect, useState } from 'react';
import { Clock, Dices } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Field,
  Input,
  Modal,
  Select,
  StatCard,
  DataTable,
  Pagination,
  TxReference,
  toast,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const PAGE_SIZE = 50;

// Columns for the per-session round breakdown shown in the detail modal.
const ROUND_COLUMNS = [
  {
    key: 'game_round',
    label: 'Round',
    sortValue: (r) => r.serial_number ?? r.game_round,
    render: (r) => (
      <span className="font-mono text-xs text-slate-400">{r.game_round || r.serial_number}</span>
    ),
  },
  { key: 'game_name', label: 'Game', render: (r) => r.game_name || '—' },
  {
    key: 'reference',
    label: 'Reference',
    sortable: false,
    render: (r) => <TxReference reference={r.serial_number} />,
  },
  {
    key: 'created_at',
    label: 'Time',
    render: (r) => <span className="text-slate-400">{fmtDate(r.created_at)}</span>,
  },
  { key: 'bet_amount', label: 'Stake', align: 'right', render: (r) => inr(r.bet_amount) },
  { key: 'win_amount', label: 'Win', align: 'right', render: (r) => inr(r.win_amount) },
  {
    key: 'balance_after',
    label: 'Balance after',
    align: 'right',
    render: (r) => (
      <span className="text-slate-400">{r.balance_after == null ? '—' : inr(r.balance_after)}</span>
    ),
  },
  {
    key: 'result',
    label: 'Result',
    align: 'right',
    sortValue: (r) => r.profit_loss,
    render: (r) =>
      r.result === 'pending' ? (
        <span className="text-amber-400">Pending</span>
      ) : (
        <span className={r.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
          {r.profit_loss >= 0 ? '+' : '−'}
          {inr(Math.abs(r.profit_loss))}
        </span>
      ),
  },
];

export default function AdminBetHistoryPage() {
  const [filters, setFilters] = useState({ status: '', userId: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    Object.entries(applied).forEach(([k, v]) => v && params.set(k, v));

    adminApi(`/api/v1/admin/bet-history?${params}`)
      .then((res) => active && setData(res))
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [applied, page]);

  const openDetail = async (row) => {
    setDetailLoading(true);
    setDetail({ session: row, rounds: [] });
    try {
      const res = await adminApi(`/api/v1/admin/bet-history/${row.session_uid}/rounds`);
      setDetail(res);
    } catch (e) {
      toast.error(e.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const summary = data?.summary;
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

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
      key: 'rounds',
      label: 'Rounds',
      render: (r) => (
        <span>
          {r.rounds}
          {r.pending_rounds > 0 && (
            <span className="ml-1 text-xs text-amber-400">({r.pending_rounds} open)</span>
          )}
        </span>
      ),
    },
    { key: 'total_bet', label: 'Bet Amount', render: (r) => inr(r.total_bet) },
    { key: 'result', label: 'Result', render: (r) => <ResultBadge record={r} /> },
    {
      key: 'last_balance',
      label: 'Wallet Amount',
      // Wallet balance the player had available after this session's latest
      // round, so money on each account can be tracked over time.
      render: (r) => (
        <span className="font-semibold text-white">
          {r.last_balance != null ? inr(r.last_balance) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (r) => {
        const d = r.last_played_at || r.created_at;
        if (!d) return '—';
        const dt = new Date(d);
        return (
          <div className="whitespace-nowrap">
            <p className="text-slate-200">{dt.toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            <p className="text-xs text-slate-500">{dt.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</p>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <Button variant="secondary" size="sm" onClick={() => openDetail(r)}>
          Rounds
        </Button>
      ),
    },
  ];

  return (
    <AdminShell title="Bet History" subtitle="Play sessions across all players">
      {summary && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sessions" value={total.toLocaleString('en-IN')} icon={Dices} />
          <StatCard label="Total staked" value={inr(summary.total_bet)} accent="sky" />
          <StatCard label="Total paid out" value={inr(summary.total_win)} accent="rose" />
          <StatCard
            label="Gross gaming revenue"
            value={inr(summary.gross_gaming_revenue)}
            accent="emerald"
            hint="Stakes minus payouts"
          />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data?.records ?? []}
        loading={loading}
        searchable
        searchKeys={['username', 'game_name']}
        searchPlaceholder="Search this page…"
        paginate={false}
        emptyIcon={Dices}
        emptyMessage="No bet history yet"
        emptyHint="Sessions appear here once players place their first bets."
        filterSubtitle="Filter sessions by result, player and date"
        filterActive={!!(applied.status || applied.userId || applied.from || applied.to)}
        onFilterApply={() => {
          setPage(0);
          setApplied(filters);
        }}
        onFilterClear={() => {
          const cleared = { status: '', userId: '', from: '', to: '' };
          setFilters(cleared);
          setApplied(cleared);
          setPage(0);
        }}
        filters={
          <>
            <Field label="Result">
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="wait">Pending</option>
                <option value="profit">Won</option>
                <option value="loss">Lost</option>
              </Select>
            </Field>
            <Field label="User ID">
              <Input
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="e.g. 42"
              />
            </Field>
            <Field label="From">
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </Field>
          </>
        }
      />

      {total > 0 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={pages}
            onPage={setPage}
            total={total}
            perPage={PAGE_SIZE}
            noun="session"
          />
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Rounds — ${detail?.session?.game_name ?? ''}`}
        size="xl"
      >
        <DataTable
          columns={ROUND_COLUMNS}
          rows={detail?.rounds ?? []}
          loading={detailLoading}
          searchable
          searchKeys={['game_name', 'game_round']}
          searchPlaceholder="Search rounds…"
          noun="round"
          emptyIcon={Dices}
          emptyMessage="No rounds recorded for this session."
        />
      </Modal>
    </AdminShell>
  );
}

function ResultBadge({ record }) {
  if (record.result === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  const up = record.profit_loss >= 0;
  return (
    <span className={`font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? '+' : '−'}
      {inr(Math.abs(record.profit_loss))}
    </span>
  );
}
