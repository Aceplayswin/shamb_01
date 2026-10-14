'use client';

/** Atterition Report — reference report `attrition`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('player', 'Player (ID)'),
  col.date('signup_date', 'Signup Date'),
  col.itz('signup_date'),
  col.date('last_activity', 'Last Activity'),
  col.itz('last_activity'),
  col.number('days_inactive', 'Days Inactive'),
  col.text('country', 'Country'),
  col.text('status', 'Status'),
];

export default function Page() {
  return (
    <ReportPage
      title="Atterition Report"
      subtitle="Players with no recent activity."
      slug="attrition"
      fields={[{ name: 'days', label: 'Inactive for (days)', type: 'number' }]}
      columns={COLUMNS}
      tableTitle="Attrition"
    />
  );
}
