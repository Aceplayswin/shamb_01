'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '../_components/Card';
import { DataState } from '../../../components/ui/DataState';
import { useAgentData } from '../../../hooks/useAgentData';
import { fmtDate, label, money, num, signClass } from '../../../lib/format';

/**
 * The live book, by sport.
 *
 * Deliberately not date-filtered — this screen answers "what am I carrying
 * right now", and a bet placed last week that has not settled is still risk
 * today. Every other screen on the panel is period-based; this one is not, and
 * that is the point of it.
 */
export default function SportAnalysisPage() {
  const { data, loading, error, reload } = useAgentData('/api/v1/agent/sport-analysis');
  // Memoised because it is an effect dependency: `data?.sports ?? []` allocates
  // a fresh empty array every render, which would re-run the effect forever.
  const sports = useMemo(() => data?.sports ?? [], [data]);
  const [active, setActive] = useState(null);

  // The first tab is only knowable once the data arrives, and it must not
  // reset every render — hence a nudge on load rather than derived state.
  useEffect(() => {
    if (sports.length && !sports.some((s) => s.sport === active)) {
      setActive(sports[0].sport);
    }
  }, [sports, active]);

  const current = sports.find((s) => s.sport === active);

  return (
    <Card title="Sport Analysis" className="animate-fade-up">
      <DataState
        loading={loading}
        error={error}
        empty={!sports.length}
        onRetry={reload}
        emptyLabel="No open bets in your downline right now"
      >
        {/* Tabs, each carrying its own event count */}
        <div className="flex flex-wrap items-end gap-1 border-b border-hairline">
          {sports.map(({ sport, count }) => {
            const isActive = sport === active;
            return (
              <button
                key={sport}
                type="button"
                onClick={() => setActive(sport)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative -mb-px rounded-t px-6 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-shell-bg font-semibold text-ink'
                    : 'bg-panel-head text-ink-muted hover:text-ink'
                }`}
              >
                {label(sport)}
                <span className="absolute -top-2 right-1 rounded bg-panel-head px-1.5 text-[11px] text-ink-muted">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Event Name</th>
                <th className="text-right">Total Bets</th>
                <th className="text-right">Exposure</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Max Profit</th>
              </tr>
            </thead>
            <tbody>
              {!current?.events?.length && (
                <tr>
                  <td colSpan={5} className="text-center text-ink-muted">
                    No Records Found
                  </td>
                </tr>
              )}

              {current?.events?.map((event) => (
                <EventRows key={event.eventId} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </Card>
  );
}

/**
 * One event and its markets.
 *
 * A fragment of two <tr>s rather than a nested table: the market breakdown has
 * to line up under the event row, and a table inside a cell would give it its
 * own independent column widths.
 */
function EventRows({ event }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="text-blue-400 underline underline-offset-4 transition hover:text-blue-300"
          >
            {event.event}
            {event.startTime ? ` - ${fmtDate(event.startTime)}` : ''}
          </button>
        </td>
        <td className="num">{num(event.totalBets)}</td>
        <td className={`num ${signClass(event.exposure)}`}>{money(event.exposure)}</td>
        <td className="num">{money(event.totalAmount)}</td>
        <td className="num">{money(event.maxProfit)}</td>
      </tr>

      {open && (
        <tr>
          <td colSpan={5} className="!p-0">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-1/3 text-center uppercase">Markets</th>
                  <th className="text-center uppercase">Bets</th>
                  <th className="text-center uppercase">Exposure</th>
                  <th className="text-center uppercase">Max Profit</th>
                </tr>
              </thead>
              <tbody>
                {event.markets.map((market) => (
                  <tr key={market.marketId}>
                    <td className="text-center font-medium">{market.market}</td>
                    <td className="text-center tabular-nums">{num(market.bets)}</td>
                    <td className={`text-center tabular-nums ${signClass(market.exposure)}`}>
                      {money(market.exposure)}
                    </td>
                    <td className="text-center tabular-nums">
                      {money(market.maxProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
