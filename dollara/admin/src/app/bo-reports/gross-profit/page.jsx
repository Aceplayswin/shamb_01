'use client';

/** Gross Profit — reference report `gross-profit`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Gross Profit"
      subtitle="Stakes minus winnings over the period."
      slug="gross-profit"
      fields={[...PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD]}
      totals={[
        { label: 'Total Bet', value: (d) => inr(d?.total_bet) },
        { label: 'Total Won', value: (d) => inr(d?.total_won) },
        {
          label: 'Gross Profit',
          value: (d) => inr(d?.gross_profit),
          tone: (d) => (Number(d?.gross_profit ?? 0) >= 0 ? 'positive' : 'negative'),
        },
        { label: 'Margin', value: (d) => `${d?.margin_percent ?? 0}%` },
      ]}
      chart={{ key: 'evolution', title: 'Profit Evolution', valueKey: 'profit' }}
    />
  );
}
