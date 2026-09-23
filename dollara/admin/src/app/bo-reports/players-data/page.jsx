'use client';

/** Players Data — reference report `players-data`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.date('signup_date', 'Signup Date'),
  col.itz('signup_date'),
  col.text('username', 'Username'),
  col.text('full_name', 'Full Name'),
  col.text('phone', 'Phone'),
  col.text('country', 'Country'),
  col.text('status', 'Status'),
  col.money('balance', 'Balance'),
];

export default function Page() {
  return (
    <ReportPage
      title="Players Data"
      subtitle="Full player export."
      slug="players-data"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Players Data"
    />
  );
}
