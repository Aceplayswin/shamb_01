'use client';

/** Free Money Analysis — reference report `freemoneyanalysisreport`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('source', 'Source'),
  col.number('count', 'Awards'),
  col.money('awarded', 'Awarded'),
  col.money('wagered', 'Wagered'),
  { key: 'turnover_ratio', label: 'Turnover ×', render: (r) => `${r.turnover_ratio}×` },
];

export default function Page() {
  return (
    <ReportPage
      title="Free Money Analysis Report"
      subtitle="Bonus money awarded against the turnover it generated."
      slug="free-money-analysis"
      fields={PERIOD_FIELDS}
      totals={[
        { label: 'Total Awarded', value: (d) => inr(d?.total_awarded) },
        { label: 'Total Wagered', value: (d) => inr(d?.total_wagered) },
        { label: 'Awards', value: (d) => Number(d?.awards ?? 0).toLocaleString('en-IN') },
        { label: 'Turnover Ratio', value: (d) => `${d?.turnover_ratio ?? 0}×` },
      ]}
      columns={COLUMNS}
      tableTitle="By Source"
    />
  );
}
