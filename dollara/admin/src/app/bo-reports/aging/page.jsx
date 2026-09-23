'use client';

/** Aging Report — reference report `aging`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('months', 'Months'),
  col.text('days_range', 'Days Range'),
  col.number('depositors', 'No Of Depositors'),
  col.money('total_deposit', 'Total Deposit Amount'),
  col.money('total_withdrawal', 'Total Withdrawal Amount'),
  col.number('withdrawal_count', 'Withdrawal Count'),
];

export default function Page() {
  return (
    <ReportPage
      title="Aging Report"
      subtitle="Depositors bucketed by account age."
      slug="aging"
      fields={[]}
      columns={COLUMNS}
      tableTitle="Aging Report"
    />
  );
}
