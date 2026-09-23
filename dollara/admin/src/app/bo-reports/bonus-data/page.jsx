'use client';

/** Player Bonus Data — reference report `bonus-data`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.money('amount', 'Amount'),
  col.text('status', 'Status'),
  col.text('source', 'Source'),
  col.date('expires_at', 'Expires'),
  col.itz('expires_at'),
];

export default function Page() {
  return (
    <ReportPage
      title="Player Bonus Data"
      subtitle="Awarded bonus export."
      slug="bonus-data"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Bonus Data"
    />
  );
}
