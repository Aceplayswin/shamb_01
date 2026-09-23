'use client';

/** Players by Gender — reference report `gender`. */

import ReportPage from '../ReportPage';

export default function Page() {
  return (
    <ReportPage
      title="Players by Gender"
      subtitle="Registered players split by declared gender."
      slug="gender"
      fields={[]}
      totals={[{ label: 'Players', value: (d) => Number(d?.total ?? 0).toLocaleString('en-IN') }]}
      breakdowns={[{ key: 'self', title: 'By Gender', money: false }]}
      exportable={false}
    />
  );
}
