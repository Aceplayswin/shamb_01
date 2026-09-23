'use client';

/** Bonus Analysis Report — reference report `bonus-analysis`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('status', 'Status'),
  col.number('count', 'Count'),
  col.money('amount', 'Amount'),
];

export default function Page() {
  return (
    <ReportPage
      title="Bonus Analysis Report"
      subtitle="Awarded bonuses grouped by status."
      slug="bonus-analysis"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Bonus Analysis"
    />
  );
}
