'use client';

import PlTable from '../../_components/PlTable';
import ReportShell from '../../_components/ReportShell';
import {
  AGENT_FIELD,
  EVENT_FIELD,
  MARKET_TYPE_FIELD,
  SPORT_FIELD,
} from '../../_components/reportFilters';
import { label, pct } from '../../../../lib/format';

const LEAD_COLUMNS = [
  { label: 'Agent', render: (row) => row.agent },
  { label: 'Name', render: (row) => row.agentName },
  { label: 'Level', render: (row) => label(row.level) },
  { label: 'Partnership', render: (row) => pct(row.partnership) },
];

/**
 * Each row is split on that row's OWN partnership, not the viewer's — which is
 * what makes this a statement of what every downline account is owed rather
 * than one number re-sliced.
 */
export default function PlByAgentPage() {
  return (
    <ReportShell
      kind="pl-agent"
      title="P&L Report By Agent"
      exportName="pl-report-by-agent"
      fields={[SPORT_FIELD, MARKET_TYPE_FIELD, EVENT_FIELD, AGENT_FIELD]}
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
