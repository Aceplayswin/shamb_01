'use client';

import ReportShell from '../../_components/ReportShell';
import SimpleTable from '../../_components/SimpleTable';
import { fmtDateTime, label, money, signClass } from '../../../../lib/format';

const COLUMNS = [
  { key: 'date', label: 'Date', render: (row) => fmtDateTime(row.date) },
  { key: 'counterparty', label: 'Account', render: (row) => row.counterparty },
  { key: 'counterpartyType', label: 'Type', render: (row) => label(row.counterpartyType) },
  {
    key: 'direction',
    label: 'Direction',
    render: (row) => (row.direction === 'down' ? 'Credit Down' : 'Credit Up'),
  },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    // Signed as it hit this agent's own balance, which is why credit down
    // reads negative here and positive on the recipient's statement.
    render: (row) => <span className={signClass(row.amount)}>{money(row.amount)}</span>,
  },
  {
    key: 'balanceAfter',
    label: 'Balance After',
    align: 'right',
    render: (row) => money(row.balanceAfter),
  },
  { key: 'remark', label: 'Remark', render: (row) => row.remark },
];

export default function TransferStatementPage() {
  return (
    <ReportShell
      kind="transfer-statement"
      title="Transfer Statement"
      exportName="transfer-statement"
      paginated
      fields={[
        {
          name: 'direction',
          label: 'Direction',
          type: 'select',
          options: [
            { value: 'down', label: 'Credit Down' },
            { value: 'up', label: 'Credit Up' },
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
          noun="transfer"
          footer={
            <>
              <td colSpan={4}>
                Grand Total — down {money(data?.grandTotal?.balanceDown)}, up{' '}
                {money(data?.grandTotal?.balanceUp)}
              </td>
              <td className={`num ${signClass(data?.grandTotal?.net)}`}>
                {money(data?.grandTotal?.net)}
              </td>
              <td colSpan={2} />
            </>
          }
        />
      )}
    </ReportShell>
  );
}
