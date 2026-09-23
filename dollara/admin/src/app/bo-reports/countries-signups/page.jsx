'use client';

/** Countries · Signups — reference report `countries-signups`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Countries Signups Report"
      subtitle="Registrations grouped by country."
      slug="countries-signups"
      fields={PERIOD_FIELDS}
      totals={[{ label: 'Total Signups', value: (d) => Number(d?.total ?? 0).toLocaleString('en-IN') }]}
      breakdowns={[{ key: 'self', title: 'By Country', money: false }]}
      exportable={false}
    />
  );
}
