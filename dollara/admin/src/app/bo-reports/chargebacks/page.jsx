'use client';

/** Charge Back Adjustments — reference report `chargebacks`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.money('amount', 'Amount'),
  col.text('currency', 'Currency'),
  col.text('status', 'Status'),
  col.text('notes', 'Notes'),
];

export default function Page() {
  return (
    <ReportPage
      title="Charge Back Adjustments"
      subtitle="Chargebacks recorded over the period."
      slug="chargebacks"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Charge Backs"
    />
  );
}
