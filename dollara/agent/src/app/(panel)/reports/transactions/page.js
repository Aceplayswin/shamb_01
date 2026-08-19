'use client';

import ReportShell from '../../_components/ReportShell';
import SimpleTable from '../../_components/SimpleTable';
import { PLAYER_FIELD } from '../../_components/reportFilters';
import { fmtDateTime, label, money, num } from '../../../../lib/format';

const COLUMNS = [
  { key: 'date', label: 'Date', render: (row) => fmtDateTime(row.date) },
  { key: 'player', label: 'Player', render: (row) => row.player },
  {
    key: 'type',
    label: 'Type',
    render: (row) => (
      <span className={row.type === 'withdrawal' ? 'text-down' : 'text-up'}>
        {label(row.type)}
      </span>
    ),
  },
  { key: 'amount', label: 'Amount', align: 'right', render: (row) => money(row.amount) },
  { key: 'status', label: 'Status', render: (row) => label(row.status) },
  { key: 'method', label: 'Method', render: (row) => row.method },
  { key: 'reference', label: 'Reference', render: (row) => row.reference },
];

export default function TransactionsReportPage() {
  return (
    <ReportShell
      kind="transactions"
      title="Transactions Report"
      exportName="transactions-report"
      paginated
      fields={[
        PLAYER_FIELD,
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          options: [
            { value: 'deposit', label: 'Deposit' },
            { value: 'withdrawal', label: 'Withdrawal' },
            { value: 'bonus_credit', label: 'Bonus Credit' },
            { value: 'adjustment', label: 'Adjustment' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'failed', label: 'Failed' },
          ],
        },
      ]}
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
          noun="transaction"
          footer={
            <>
              <td colSpan={3}>
                Grand Total — {num(data?.grandTotal?.depositCount)} deposits,{' '}
                {num(data?.grandTotal?.withdrawalCount)} withdrawals
              </td>
              <td className="num">{money(data?.grandTotal?.net)}</td>
              <td colSpan={3} />
            </>
          }
        />
      )}
    </ReportShell>
  );
}
