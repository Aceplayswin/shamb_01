'use client';

import { useState } from 'react';
import Card from '../_components/Card';
import DateRangeField from '../_components/DateRangeField';
import MiniTable from '../_components/MiniTable';
import StatTile from '../_components/StatTile';
import { DataState } from '../../../components/ui/DataState';
import { useAgent } from '../../../context/AgentContext';
import { useAgentData } from '../../../hooks/useAgentData';
import { fmtDateTime, money, num, signClass, todayIso } from '../../../lib/format';

/** A P&L cell: right-aligned, coloured by sign, two decimals. */
function Money({ value, signed = false }) {
  return (
    <span className={`tabular-nums ${signed ? signClass(value) : ''}`}>
      {money(value)}
    </span>
  );
}

const PLAYER_STAT_COLUMNS = [
  { key: 'player', label: 'Player (Userid)' },
  { key: 'balance', label: 'Balance' },
  { key: 'casinoBonusBalance', label: 'Casino Bonus Bal' },
  { key: 'sportsBonusBalance', label: 'Sports Bonus Bal' },
  { key: 'casinoBets', label: 'Casino Bets' },
  { key: 'casinoWins', label: 'Casino Wins' },
  { key: 'casinoPl', label: 'Casino P&L', signed: true },
  { key: 'sportsBets', label: 'Sports Bets' },
  { key: 'sportsWins', label: 'Sports Wins' },
  { key: 'sportsPl', label: 'Sports P&L', signed: true },
];

export default function DashboardPage() {
  const { range, setRange } = useAgent();

  // Draft vs applied, for the same reason the report screens keep them apart:
  // editing a date must not fire a query per keystroke, and the numbers on
  // screen must match the period that produced them.
  const [draft, setDraft] = useState(range);
  const [applied, setApplied] = useState(range);

  const { data, loading, error, reload } = useAgentData(
    `/api/v1/agent/dashboard?from=${applied.from}&to=${applied.to}`,
    [applied.from, applied.to],
  );

  const submit = (event) => {
    event.preventDefault();
    setApplied(draft);
    setRange(draft);
  };

  const reset = () => {
    const today = { from: todayIso(), to: todayIso() };
    setDraft(today);
    setApplied(today);
    setRange(today);
  };

  const stats = data?.playerStats ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Title + period ── */}
      <form
        onSubmit={submit}
        className="flex flex-wrap items-end gap-4 sm:items-center"
      >
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <span className="text-sm text-ink-muted">From to Until</span>
        <div className="min-w-[280px] flex-1">
          <DateRangeField
            id="dashboard-period"
            from={draft.from}
            to={draft.to}
            onChange={(from, to) => setDraft({ from, to })}
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">
            Submit
          </button>
          <button type="button" onClick={reset} className="btn-success">
            Reset
          </button>
        </div>
      </form>

      {/* ── Per-player breakdown ── */}
      <Card title="Player Stats">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {PLAYER_STAT_COLUMNS.map(({ key, label }) => (
                  <th key={key} className={key === 'player' ? '' : 'text-right'}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <DataState
                loading={loading}
                error={error}
                empty={!stats.length}
                onRetry={reload}
                colSpan={PLAYER_STAT_COLUMNS.length}
                emptyLabel="No player activity in this period"
                skeleton={
                  <tr>
                    <td colSpan={PLAYER_STAT_COLUMNS.length} className="!p-0">
                      <div className="h-20 animate-pulse bg-panel-head/50" />
                    </td>
                  </tr>
                }
              >
                {stats.map((row) => (
                  <tr key={row.userId}>
                    <td className="whitespace-nowrap">
                      {row.username} ( {row.userId} )
                    </td>
                    {PLAYER_STAT_COLUMNS.slice(1).map(({ key, signed }) => (
                      <td key={key} className="num">
                        <Money value={row[key]} signed={signed} />
                      </td>
                    ))}
                  </tr>
                ))}
              </DataState>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Headline tiles ── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Agents"
          tone="violet"
          lines={[
            { label: 'New Agents', value: num(data?.agents?.newAgents) },
            { label: 'New Players', value: num(data?.agents?.newPlayers) },
            { label: 'Total Players', value: num(data?.agents?.totalPlayers) },
          ]}
        />
        <StatTile
          title="Players"
          tone="blue"
          lines={[
            { label: 'Active Players', value: num(data?.players?.active) },
            {
              label: 'Last Hour Active Players',
              value: num(data?.players?.lastHourActive),
            },
          ]}
        />
        <StatTile title="P & L" tone="amber" value={money(data?.pl)} />
        <StatTile title="TOTAL BETS" tone="rose" value={num(data?.totalBets)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <StatTile
          title="Sum Of Deposits"
          tone="emerald"
          value={money(data?.deposits?.total)}
          footer={
            <>
              <span>Player Deposits: {money(data?.deposits?.total)}</span>
              <span>Deposit Count: {num(data?.deposits?.count)}</span>
            </>
          }
        />
        <StatTile
          title="Sum Of Withdrawals"
          tone="rose"
          value={money(data?.withdrawals?.total)}
          footer={
            <>
              <span>Player Withdrawals: {money(data?.withdrawals?.total)}</span>
              <span>Withdrawals Count: {num(data?.withdrawals?.count)}</span>
            </>
          }
        />
        <StatTile
          title="Revenue"
          tone="blue"
          lines={[
            { label: 'Sports Revenue', value: money(data?.revenue?.sports) },
            { label: 'Casino Revenue', value: money(data?.revenue?.casino) },
          ]}
        />
      </div>

      {/* ── Ranked tables ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Top 5 Winning Player" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.topWinningPlayers}
            columns={[
              { key: 'player', label: 'Player' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (row) => money(row.amount),
              },
            ]}
          />
        </Card>

        <Card title="Top 5 Losing Player" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.topLosingPlayers}
            columns={[
              { key: 'player', label: 'Player' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (row) => money(row.amount),
              },
            ]}
          />
        </Card>

        <Card title="Top 5 Winning Markets" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.topWinningMarkets}
            columns={[
              { key: 'sport', label: 'Sport' },
              { key: 'market', label: 'Market' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (row) => money(row.amount),
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Top 5 Losing Markets" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.topLosingMarkets}
            columns={[
              { key: 'sport', label: 'Sport' },
              { key: 'market', label: 'Market' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (row) => money(row.amount),
              },
            ]}
          />
        </Card>

        <Card title="Deposit Count Top 10" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.depositCountTop10}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'player', label: 'Player' },
              { key: 'count', label: 'Count', align: 'right' },
              {
                key: 'totalDeposit',
                label: 'Total Deposit',
                align: 'right',
                render: (row) => money(row.totalDeposit),
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Deposit Max Top 10" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.depositMaxTop10}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'player', label: 'Player' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (row) => money(row.amount),
              },
              {
                key: 'time',
                label: 'Time',
                render: (row) => fmtDateTime(row.time),
              },
              { key: 'method', label: 'Deposit Method' },
            ]}
          />
        </Card>

        <Card title="Withdraw Count Top 10" bodyClassName="!px-0">
          <MiniTable
            loading={loading}
            error={error}
            onRetry={reload}
            rows={data?.withdrawCountTop10}
            columns={[
              { key: 'rank', label: '#' },
              { key: 'player', label: 'Player' },
              { key: 'count', label: 'Count', align: 'right' },
              {
                key: 'totalWithdraw',
                label: 'Total Withdraw',
                align: 'right',
                render: (row) => money(row.totalWithdraw),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
