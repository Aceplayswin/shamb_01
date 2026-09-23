'use client';

/** Log History Report — reference report `log-history`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.date('created_at', 'Date'),
  col.itz('created_at'),
  col.text('admin', 'Administrator'),
  col.text('action', 'Action'),
  col.text('entity_type', 'Entity'),
  col.text('entity_id', 'Entity ID'),
  col.text('ip_address', 'IP Address'),
];

export default function Page() {
  return (
    <ReportPage
      title="Log History Report"
      subtitle="Administrator action audit trail."
      slug="log-history"
      fields={[{ name: 'adminId', label: 'Admin ID' }, { name: 'action', label: 'Action' }]}
      columns={COLUMNS}
      tableTitle="Log History"
    />
  );
}
