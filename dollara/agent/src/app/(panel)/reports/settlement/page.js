'use client';

import ReportShell from '../../_components/ReportShell';
import SimpleTable from '../../_components/SimpleTable';
import { fmtDateTime, label, money, signClass } from '../../../../lib/format';

const COLUMNS = [
  { key: 'date', label: 'Date', render: (row) => fmtDateTime(row.date) },
  { key: 'counterparty', label: 'Account', render: (row) => row.counterparty },
  { key: 'counterpartyType', label: 'Type', render: (row) => label(row.counterpartyType) },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    // Signed from this agent's side: positive means the counterparty paid up.
    render: (row) => <span className={signClass(row.amount)}>{money(row.amount)}</span>,
  },
  {
    key: 'plBefore',
    label: 'P&L Before',
    align: 'right',
    render: (row) => <span className={signClass(row.plBefore)}>{money(row.plBefore)}</span>,
  },
  {
    key: 'plAfter',
    label: 'P&L After',
    align: 'right',
    render: (row) => <span className={signClass(row.plAfter)}>{money(row.plAfter)}</span>,
  },
  { key: 'period', label: 'Period', render: (row) => row.period },
  { key: 'note', label: 'Note', render: (row) => row.note },
];

export default function SettlementReportPage() {
  return (
    <ReportShell
      kind="settlement"
      title="Settlement Report"
      exportName="settlement-report"
      paginated
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
          noun="settlement"
          footer={
            <>
              <td colSpan={3}>Grand Total</td>
              <td className={`num ${signClass(data?.grandTotal?.amount)}`}>
                {money(data?.grandTotal?.amount)}
              </td>
              <td colSpan={4} />
            </>
          }
        />
      )}
    </ReportShell>
  );
}
