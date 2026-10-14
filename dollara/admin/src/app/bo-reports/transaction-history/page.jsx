'use client';

/** Transaction History — reference report `transaction-history`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.text('type', 'Type'),
  col.money('amount', 'Amount'),
  col.text('currency', 'Currency'),
  col.text('status', 'Status'),
  col.text('method', 'Method'),
  col.text('reference', 'Reference'),
];

export default function Page() {
  return (
    <ReportPage
      title="Transaction History"
      subtitle="Every ledger movement."
      slug="transaction-history"
      fields={[...PERIOD_FIELDS, { name: 'playerId', label: 'Player ID' }]}
      columns={COLUMNS}
      tableTitle="Transaction History"
    />
  );
}
