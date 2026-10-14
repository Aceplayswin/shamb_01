'use client';

/** Countries · Gross Profit — reference report `countries-profit`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Countries Gross Profit Report"
      subtitle="House profit grouped by country."
      slug="countries-profit"
      fields={PERIOD_FIELDS}
      totals={[{ label: 'Total Gross Profit', value: (d) => inr(d?.total) }]}
      breakdowns={[{ key: 'self', title: 'By Country' }]}
      exportable={false}
    />
  );
}
