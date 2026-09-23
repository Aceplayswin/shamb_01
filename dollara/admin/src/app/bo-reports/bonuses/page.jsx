'use client';

/** Player Bonuses — reference report `bonuses`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, {
  PERIOD_FIELDS,
  COUNTRY_FIELD,
  CURRENCY_FIELD,
} from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Player Bonuses"
      subtitle="Bonuses awarded over the selected period."
      slug="bonuses"
      fields={PERIOD_FIELDS}
  totals={[
    { label: 'Total Amount', value: (d) => inr(d?.total) },
    { label: 'Transactions', value: (d) => Number(d?.count ?? 0).toLocaleString('en-IN') },
  ]}
      chart={{ key: 'evolution', title: 'Bonuses Evolution' }}
      breakdowns={[{ key: 'by_status', title: 'By Status' }, { key: 'by_source', title: 'By Source' }]}
    />
  );
}
