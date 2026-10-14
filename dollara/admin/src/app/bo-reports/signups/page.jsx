'use client';

/** Signups Report — reference report `signups`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Signups Report"
      subtitle="Registrations over the selected period."
      slug="signups"
      fields={PERIOD_FIELDS}
      totals={[
        { label: 'Total Signups', value: (d) => Number(d?.total ?? 0).toLocaleString('en-IN') },
      ]}
      chart={{ key: 'evolution', title: 'Signups Evolution', valueKey: 'count', money: false }}
      breakdowns={[{ key: 'by_country', title: 'By Country', money: false }]}
      exportable={false}
    />
  );
}
