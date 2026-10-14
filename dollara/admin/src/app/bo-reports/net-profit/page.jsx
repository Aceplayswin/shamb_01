'use client';

/** Net Profit — reference report `net-profit`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Net Profit"
      subtitle="Gross profit less bonuses awarded."
      slug="net-profit"
      fields={[...PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD]}
      totals={[
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
      ]}
      chart={{ key: 'evolution', title: 'Profit Evolution', valueKey: 'profit' }}
    />
  );
}
