'use client';

/** Deposits Report — reference report `deposits`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, {
  PERIOD_FIELDS,
  COUNTRY_FIELD,
  CURRENCY_FIELD,
} from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Deposits Report"
      subtitle="Player deposits over the selected period."
      slug="deposits"
      fields={[...PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD]}
  totals={[
    { label: 'Total Amount', value: (d) => inr(d?.total) },
    { label: 'Transactions', value: (d) => Number(d?.count ?? 0).toLocaleString('en-IN') },
  ]}
      chart={{ key: 'evolution', title: 'Deposits Evolution' }}
      breakdowns={[{ key: 'by_country', title: 'By Country' }, { key: 'by_currency', title: 'By Currency' }, { key: 'by_method', title: 'By Payment Method' }]}
    />
  );
}
