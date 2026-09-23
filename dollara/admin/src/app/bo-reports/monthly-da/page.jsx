'use client';

/** Month Wise DA Report — reference report `monthly-da`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('period', 'Period'),
  col.money('deposits', 'Deposits'),
  col.number('deposit_count', 'Deposit Count'),
  col.money('withdrawals', 'Withdrawals'),
  col.number('withdrawal_count', 'Withdrawal Count'),
  col.signed('net', 'Net'),
];

export default function Page() {
  return (
    <ReportPage
      title="Month Wise DA Report"
      subtitle="Deposits and withdrawals per month."
      slug="monthly-da"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Month Wise DA"
    />
  );
}
