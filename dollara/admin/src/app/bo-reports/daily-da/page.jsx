'use client';

/** Day Wise DA Report — reference report `daily-da`. */

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
      title="Day Wise DA Report"
      subtitle="Deposits and withdrawals per day."
      slug="daily-da"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Day Wise DA"
    />
  );
}
