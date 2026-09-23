'use client';

/** One Page Report — the headline numbers for a period. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="One Page Report"
      subtitle="Every headline figure for the selected period."
      slug="one-page"
      fields={PERIOD_FIELDS}
      totals={[
        { label: 'Signups', value: (d) => Number(d?.signups ?? 0).toLocaleString('en-IN') },
        { label: 'Active Players', value: (d) => Number(d?.active_players ?? 0).toLocaleString('en-IN') },
        { label: 'Deposits', value: (d) => inr(d?.deposits) },
        { label: 'Withdrawals', value: (d) => inr(d?.withdrawals) },
        {
          label: 'Net Cash',
          value: (d) => inr(d?.net_cash),
          tone: (d) => (Number(d?.net_cash ?? 0) >= 0 ? 'positive' : 'negative'),
        },
        { label: 'Total Bet', value: (d) => inr(d?.total_bet) },
        { label: 'Total Won', value: (d) => inr(d?.total_won) },
        {
          label: 'Gross Profit',
          value: (d) => inr(d?.gross_profit),
          tone: (d) => (Number(d?.gross_profit ?? 0) >= 0 ? 'positive' : 'negative'),
        },
        { label: 'Bonus Cost', value: (d) => inr(d?.bonus_cost) },
        {
          label: 'Net Profit',
          value: (d) => inr(d?.net_profit),
          tone: (d) => (Number(d?.net_profit ?? 0) >= 0 ? 'positive' : 'negative'),
        },
        { label: 'Rounds', value: (d) => Number(d?.rounds ?? 0).toLocaleString('en-IN') },
      ]}
      exportable={false}
    />
  );
}
