'use client';

import ReportShell from '../../_components/ReportShell';
import SimpleTable from '../../_components/SimpleTable';
import {
  EVENT_FIELD,
  MARKET_TYPE_FIELD,
  PLAYER_FIELD,
  SPORT_FIELD,
} from '../../_components/reportFilters';
import { fmtDateTime, label, money, signClass } from '../../../../lib/format';

const COLUMNS = [
  { key: 'placedAt', label: 'Placed', render: (row) => fmtDateTime(row.placedAt) },
  { key: 'player', label: 'Player', render: (row) => row.player },
  { key: 'event', label: 'Event', render: (row) => row.event },
  { key: 'market', label: 'Market', render: (row) => row.market },
  { key: 'selection', label: 'Selection', render: (row) => row.selection ?? '—' },
  {
    key: 'side',
    label: 'Side',
    render: (row) => (
      // Back and lay are opposite positions; colouring them is how an operator
      // scans a long list without reading every row.
      <span className={row.side === 'lay' ? 'text-rose-300' : 'text-sky-300'}>
        {label(row.side)}
      </span>
    ),
  },
  { key: 'odds', label: 'Odds', align: 'right', render: (row) => row.odds },
  { key: 'stake', label: 'Stake', align: 'right', render: (row) => money(row.stake) },
  {
    key: 'liability',
    label: 'Liability',
    align: 'right',
    render: (row) => money(row.liability),
  },
  {
    key: 'profitLoss',
    label: 'P&L',
    align: 'right',
    render: (row) => (
      <span className={signClass(row.profitLoss)}>{money(row.profitLoss)}</span>
    ),
  },
  { key: 'status', label: 'Status', render: (row) => label(row.status) },
];

export default function BetListPage() {
  return (
    <ReportShell
      kind="bet-list"
      title="Bet List"
      exportName="bet-list"
      paginated
      fields={[SPORT_FIELD, MARKET_TYPE_FIELD, EVENT_FIELD, PLAYER_FIELD]}
    >
      {({ data, loading, error, reload, page, setPage, perPage }) => (
        <SimpleTable
          columns={COLUMNS}
          data={data}
          loading={loading}
          error={error}
          onRetry={reload}
          page={page}
          setPage={setPage}
          perPage={perPage}
          noun="bet"
          footer={
            <>
              <td colSpan={7}>Grand Total</td>
              <td className="num">{money(data?.grandTotal?.turnover)}</td>
              <td className="num" />
              <td className={`num ${signClass(data?.grandTotal?.memberPl)}`}>
                {money(data?.grandTotal?.memberPl)}
              </td>
              <td />
            </>
          }
        />
      )}
    </ReportShell>
  );
}
