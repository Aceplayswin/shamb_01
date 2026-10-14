'use client';

/** Deposits Data — reference report `deposits-data`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'Deposit ID'),
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.money('amount', 'Amount'),
  col.text('currency', 'Currency'),
  col.text('method', 'Method'),
  col.text('provider_payment_id', 'Provider Payment ID'),
  col.text('status', 'Status'),
  col.text('error_message', 'Error Message'),
];

export default function Page() {
  return (
    <ReportPage
      title="Deposits Data"
      subtitle="Deposit export including failures."
      slug="deposits-data"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Deposits Data"
    />
  );
}
