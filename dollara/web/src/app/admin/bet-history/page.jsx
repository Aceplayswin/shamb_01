'use client';

// Admin bet history — every player's game sessions, with a round-by-round
// drill-down. A session still awaiting the provider's result reads Pending
// rather than being reported as a loss.

import { useEffect, useState } from 'react';
import { Clock, Dices, Loader2 } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Select,
  StatCard,
  DataTable,
  toast,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const PAGE_SIZE = 50;

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

  const search = (e) => {
    e.preventDefault();
    setPage(0);
    setApplied(filters);
  };

  const summary = data?.summary;
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.last_played_at || r.created_at) },
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
    { key: 'total_bet', label: 'Staked', render: (r) => inr(r.total_bet) },
    { key: 'total_win', label: 'Won', render: (r) => inr(r.total_win) },
    {
      key: 'last_balance',
      label: 'Total Amount',
      // Wallet balance the player had available after this session's latest
      // round, so money on each account can be tracked over time.
      render: (r) => (
        <span className="font-semibold text-white">
          {r.last_balance != null ? inr(r.last_balance) : '—'}
        </span>
      ),
    },
    { key: 'result', label: 'Result', render: (r) => <ResultBadge record={r} /> },
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

      <Card className="mb-5 p-4">
        <form onSubmit={search} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const cleared = { status: '', userId: '', from: '', to: '' };
                setFilters(cleared);
                setApplied(cleared);
                setPage(0);
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <DataTable
        columns={columns}
        rows={data?.records ?? []}
        loading={loading}
        searchable
        searchKeys={['username', 'game_name']}
        searchPlaceholder="Search this page…"
        emptyIcon={Dices}
        emptyMessage="No bet history yet"
        emptyHint="Sessions appear here once players place their first bets."
      />

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page + 1} of {pages} · {total.toLocaleString('en-IN')} sessions
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Rounds — ${detail?.session?.game_name ?? ''}`}
        size="xl"
      >
        {detailLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading rounds…
          </p>
        ) : !detail?.rounds?.length ? (
          <p className="py-6 text-sm text-slate-400">No rounds recorded for this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Round</th>
                  <th className="px-2 py-2">Game</th>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2 text-right">Stake</th>
                  <th className="px-2 py-2 text-right">Win</th>
                  <th className="px-2 py-2 text-right">Balance after</th>
                  <th className="px-2 py-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {detail.rounds.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-400">
                      {r.game_round || r.serial_number}
                    </td>
                    <td className="px-2 py-2.5">{r.game_name || '—'}</td>
                    <td className="px-2 py-2.5 text-slate-400">{fmtDate(r.created_at)}</td>
                    <td className="px-2 py-2.5 text-right">{inr(r.bet_amount)}</td>
                    <td className="px-2 py-2.5 text-right">{inr(r.win_amount)}</td>
                    <td className="px-2 py-2.5 text-right text-slate-400">
                      {r.balance_after == null ? '—' : inr(r.balance_after)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {r.result === 'pending' ? (
                        <span className="text-amber-400">Pending</span>
                      ) : (
                        <span
                          className={
                            r.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {r.profit_loss >= 0 ? '+' : '−'}
                          {inr(Math.abs(r.profit_loss))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
