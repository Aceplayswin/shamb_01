'use client';

import ReportShell from '../../_components/ReportShell';
import SimpleTable from '../../_components/SimpleTable';
import { label, money, num, signClass } from '../../../../lib/format';

const COLUMNS = [
  { key: 'agent', label: 'Agent', render: (row) => row.agent },
  { key: 'level', label: 'Level', render: (row) => label(row.level) },
  { key: 'players', label: 'Players', align: 'right', render: (row) => num(row.players) },
  {
    key: 'deposits',
    label: 'Deposits',
    align: 'right',
    render: (row) => money(row.deposits),
  },
  {
    key: 'withdrawals',
    label: 'Withdrawals',
    align: 'right',
    render: (row) => money(row.withdrawals),
  },
  {
    key: 'sportsPl',
    label: 'Sports P&L',
    align: 'right',
    render: (row) => <span className={signClass(row.sportsPl)}>{money(row.sportsPl)}</span>,
  },
  {
    key: 'casinoPl',
    label: 'Casino P&L',
    align: 'right',
    render: (row) => <span className={signClass(row.casinoPl)}>{money(row.casinoPl)}</span>,
  },
  {
    key: 'grossRevenue',
    label: 'Gross Revenue',
    align: 'right',
    render: (row) => (
      <span className={signClass(row.grossRevenue)}>{money(row.grossRevenue)}</span>
    ),
  },
  {
    key: 'realRevenue',
    label: 'Real Revenue',
    align: 'right',
    render: (row) => (
      <span className={signClass(row.realRevenue)}>{money(row.realRevenue)}</span>
    ),
  },
];

/**
 * Cash in, cash out, and what the book actually kept.
 *
 * Distinct from the P&L reports: those measure the book, this measures the
 * cash. A period can show a winning book and negative real revenue whenever
 * players withdrew more than they deposited, and an agent settling up needs
 * both numbers rather than one inferred from the other.
 */
export default function RealRevenuePage() {
  return (
    <ReportShell
      kind="real-revenue"
      title="Real Revenue Report"
      exportName="real-revenue-report"
    >
      {({ data, loading, error, reload }) => (
        <SimpleTable
          columns={COLUMNS}
          data={data}
          loading={loading}
          error={error}
          onRetry={reload}
          footer={
            <>
              <td colSpan={2}>Grand Total</td>
              <td className="num">{num(data?.grandTotal?.players)}</td>
              <td className="num">{money(data?.grandTotal?.deposits)}</td>
              <td className="num">{money(data?.grandTotal?.withdrawals)}</td>
              <td className={`num ${signClass(data?.grandTotal?.sportsPl)}`}>
                {money(data?.grandTotal?.sportsPl)}
              </td>
              <td className={`num ${signClass(data?.grandTotal?.casinoPl)}`}>
                {money(data?.grandTotal?.casinoPl)}
              </td>
              <td className={`num ${signClass(data?.grandTotal?.grossRevenue)}`}>
                {money(data?.grandTotal?.grossRevenue)}
              </td>
              <td className={`num ${signClass(data?.grandTotal?.realRevenue)}`}>
                {money(data?.grandTotal?.realRevenue)}
              </td>
            </>
          }
        />
      )}
    </ReportShell>
  );
}
