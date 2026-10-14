'use client';

import { DataState } from '../../../components/ui/DataState';
import { money, num, signClass } from '../../../lib/format';

/**
 * The MEMBER / AGENT / UPLINE table shared by the three P&L reports.
 *
 * The header is two rows deep because the panel groups nine columns under three
 * owners, and a flat header ("Member Win", "Agent Win", …) makes a wide table
 * unreadable. The `colSpan`/`rowSpan` pair below is what produces that grouping.
 *
 * `leadColumns` is what differs between the three reports — by market it is
 * sport/event/market, by agent it is one account, by event it is the fixture —
 * so each report passes its own and inherits the other nine.
 */

const MEMBER_COLUMNS = [
  { key: 'totalBets', label: 'Total Bets', kind: 'count' },
  { key: 'turnover', label: 'T/O' },
  { key: 'memberWin', label: 'Win', signed: true },
  { key: 'memberComm', label: 'Comm', signed: true },
  { key: 'memberPl', label: 'P&L', signed: true },
];

const AGENT_COLUMNS = [
  { key: 'agentWin', label: 'Win', signed: true },
  { key: 'agentComm', label: 'Comm', signed: true },
  { key: 'agentPl', label: 'P&L', signed: true },
];

const UPLINE_COLUMNS = [{ key: 'uplinePl', label: 'P&L', signed: true }];

const VALUE_COLUMNS = [...MEMBER_COLUMNS, ...AGENT_COLUMNS, ...UPLINE_COLUMNS];

function Cell({ column, row }) {
  const value = row?.[column.key];
  if (column.kind === 'count') {
    return <td className="num">{num(value)}</td>;
  }
  return (
    <td className={`num ${column.signed ? signClass(value) : ''}`}>{money(value)}</td>
  );
}

export default function PlTable({ leadColumns, data, loading, error, onRetry }) {
  const rows = data?.rows ?? [];
  const grand = data?.grandTotal;
  const totalColumns = leadColumns.length + VALUE_COLUMNS.length;

  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            {leadColumns.map((column) => (
              <th key={column.label} rowSpan={2}>
                {column.label}
              </th>
            ))}
            <th colSpan={MEMBER_COLUMNS.length} className="text-center">
              MEMBER
            </th>
            <th colSpan={AGENT_COLUMNS.length} className="text-center">
              AGENT
            </th>
            <th colSpan={UPLINE_COLUMNS.length} className="text-center">
              UPLINE
            </th>
          </tr>
          <tr>
            {VALUE_COLUMNS.map((column, index) => (
              // Labels repeat across the three groups ("Win" appears twice), so
              // the group index is part of the key.
              <th key={`${column.key}-${index}`} className="text-right">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <DataState
            loading={loading}
            error={error}
            empty={!rows.length}
            onRetry={onRetry}
            colSpan={totalColumns}
            skeleton={
              <tr>
                <td colSpan={totalColumns} className="!p-0">
                  <div className="h-28 animate-pulse bg-panel-head/50" />
                </td>
              </tr>
            }
          >
            {rows.map((row, index) => (
              <tr key={row.marketId ?? row.agentId ?? row.eventId ?? index}>
                {leadColumns.map((column) => (
                  <td key={column.label}>{column.render(row)}</td>
                ))}
                {VALUE_COLUMNS.map((column, columnIndex) => (
                  <Cell key={`${column.key}-${columnIndex}`} column={column} row={row} />
                ))}
              </tr>
            ))}
          </DataState>
        </tbody>

        {/* The grand total stays outside <tbody> so it is never swapped out
            with the rows by DataState, and prints even on an empty result —
            which is what the panel does. */}
        {grand && (
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={leadColumns.length}>Grand Total</td>
              {VALUE_COLUMNS.map((column, columnIndex) => (
                <Cell key={`${column.key}-${columnIndex}`} column={column} row={grand} />
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
