'use client';

import PlTable from '../../_components/PlTable';
import ReportShell from '../../_components/ReportShell';
import { AGENT_FIELD, EVENT_FIELD, SPORT_FIELD } from '../../_components/reportFilters';
import { fmtDate, label, num } from '../../../../lib/format';

const LEAD_COLUMNS = [
  { label: 'Sport', render: (row) => label(row.sport) },
  { label: 'Event', render: (row) => row.event },
  { label: 'Start', render: (row) => fmtDate(row.startTime) },
  { label: 'Players', render: (row) => num(row.players) },
];

export default function EventPlPage() {
  return (
    <ReportShell
      kind="event-pl"
      title="Event P&L Report"
      exportName="event-pl-report"
      fields={[SPORT_FIELD, EVENT_FIELD, AGENT_FIELD]}
    >
      {({ data, loading, error, reload }) => (
        <PlTable
          leadColumns={LEAD_COLUMNS}
          data={data}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      )}
    </ReportShell>
  );
}
