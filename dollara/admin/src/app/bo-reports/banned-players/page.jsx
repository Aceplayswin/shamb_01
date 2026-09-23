'use client';

/** Fraud / Banned Players Data — reference report `banned-players`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('player', 'Player (ID)'),
  col.text('full_name', 'Full Name'),
  col.text('phone', 'Phone'),
  col.text('country', 'Country'),
  col.text('status', 'Status'),
  col.date('signup_date', 'Signup Date'),
  col.itz('signup_date'),
];

export default function Page() {
  return (
    <ReportPage
      title="Fraud / Banned Players Data"
      subtitle="Blocked and suspended accounts."
      slug="banned-players"
      fields={[]}
      columns={COLUMNS}
      tableTitle="Banned Players"
    />
  );
}
