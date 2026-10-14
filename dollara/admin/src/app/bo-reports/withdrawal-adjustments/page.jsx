'use client';

/** Withdrawal Adjustments — reference report `withdrawal-adjustments`. */

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
      title="Withdrawal Adjustments"
      subtitle="Negative adjustments against player balances."
      slug="withdrawal-adjustments"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Withdrawal Adjustments"
    />
  );
}
