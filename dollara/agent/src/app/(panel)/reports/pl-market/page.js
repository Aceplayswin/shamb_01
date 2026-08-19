'use client';

import PlTable from '../../_components/PlTable';
import ReportShell from '../../_components/ReportShell';
import {
  AGENT_FIELD,
  EVENT_FIELD,
  MARKET_TYPE_FIELD,
  SPORT_FIELD,
} from '../../_components/reportFilters';
import { label } from '../../../../lib/format';

const LEAD_COLUMNS = [
  { label: 'Sport', render: (row) => label(row.sport) },
  { label: 'Event', render: (row) => row.event },
  { label: 'Market', render: (row) => row.market },
];

export default function PlByMarketPage() {
  return (
    <ReportShell
      kind="pl-market"
      title="P&L Report By Market"
      exportName="pl-report-by-market"
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
