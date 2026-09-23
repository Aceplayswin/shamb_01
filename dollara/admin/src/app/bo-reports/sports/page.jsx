'use client';

/** Sports Report — reference reports `sportsreport` and `reportsports`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('sport', 'Sport'),
  col.number('bets', 'Bets'),
  col.money('total_stake', 'Total Stake'),
  col.signed('profit', 'Profit'),
  col.money('exposure', 'Exposure'),
];

export default function Page() {
  return (
    <ReportPage
      title="Sports Report"
      subtitle="Sportsbook stakes and house result, by sport."
      slug="sports"
      fields={[...PERIOD_FIELDS, { name: 'sport', label: 'Sport' }]}
      totals={[
        { label: 'Total Stake', value: (d) => inr(d?.total_stake) },
        {
          label: 'Total Profit',
          value: (d) => inr(d?.total_profit),
          tone: (d) => (Number(d?.total_profit ?? 0) >= 0 ? 'positive' : 'negative'),
        },
      ]}
      columns={COLUMNS}
      tableTitle="By Sport"
    />
  );
}
