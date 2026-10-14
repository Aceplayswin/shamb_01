'use client';

/** Payment Methods Report — reference report `payment-methods`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, {
  PERIOD_FIELDS,
  COUNTRY_FIELD,
  CURRENCY_FIELD,
} from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Payment Methods Report"
      subtitle="Deposit volume split by payment method."
      slug="payment-methods"
      fields={[...PERIOD_FIELDS, COUNTRY_FIELD, CURRENCY_FIELD]}
  totals={[{ label: 'Total Deposit Amount', value: (d) => inr(d?.total) }]}
      chart={{ key: 'evolution', title: 'Deposits Evolution' }}
      breakdowns={[{ key: 'by_method', title: 'By Payment Method' }]}
    />
  );
}
