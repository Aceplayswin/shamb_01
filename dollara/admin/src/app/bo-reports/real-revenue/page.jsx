'use client';

/** Real Revenue — reference report `realrevenue`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Real Revenue"
      subtitle="What the house kept once bonus money is deducted."
      slug="real-revenue"
      fields={PERIOD_FIELDS}
      totals={[
        { label: 'Total Bet', value: (d) => inr(d?.total_bet) },
        { label: 'Total Won', value: (d) => inr(d?.total_won) },
        { label: 'Gross Profit', value: (d) => inr(d?.gross_profit) },
        { label: 'Bonus Cost', value: (d) => inr(d?.bonus_cost) },
        {
          label: 'Real Revenue',
          value: (d) => inr(d?.real_revenue),
          tone: (d) => (Number(d?.real_revenue ?? 0) >= 0 ? 'positive' : 'negative'),
        },
        { label: 'Margin', value: (d) => `${d?.margin_percent ?? 0}%` },
      ]}
      chart={{ key: 'evolution', title: 'Revenue Evolution' }}
      exportable={false}
    />
  );
}
