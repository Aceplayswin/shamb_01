'use client';

/** Refunds Adjustments — reference report `refunds`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.money('amount', 'Amount'),
  col.text('currency', 'Currency'),
  col.text('status', 'Status'),
  col.text('method', 'Method'),
  col.text('notes', 'Notes'),
];

export default function Page() {
  return (
    <ReportPage
      title="Refunds Adjustments"
      subtitle="Refunds issued over the period."
      slug="refunds"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Refunds"
    />
  );
}
