'use client';

/** Other Adjustments — reference report `other-adjustments`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.money('amount', 'Amount'),
  col.text('status', 'Status'),
  col.text('notes', 'Notes'),
];

export default function Page() {
  return (
    <ReportPage
      title="Other Adjustments"
      subtitle="Manual ledger adjustments."
      slug="other-adjustments"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Other Adjustments"
    />
  );
}
