'use client';

/** Online Players List — reference screen `/players-online`. */

import { SearchPage, col } from '@/components/admin/Backoffice';

const FIELDS = [
  {
    name: 'minutes',
    label: 'Seen within',
    type: 'select',
    options: [
      { value: '', label: 'Last 15 minutes' },
      { value: '30', label: 'Last 30 minutes' },
      { value: '60', label: 'Last hour' },
      { value: '1440', label: 'Last 24 hours' },
    ],
  },
];

const COLUMNS = [
  col.date('signup_date', 'Signup Date'),
  col.text('player', 'Player (ID)'),
  col.text('full_name', 'Full Name'),
  col.text('country', 'Country'),
  col.text('ip', 'IP'),
  col.text('phone', 'Phone Number'),
  col.number('logins', 'Logins'),
  col.text('deposits', 'Deposits'),
  col.money('balance', 'Balance'),
];

export default function PlayersOnlinePage() {
  return (
    <SearchPage
      title="Online Players List"
      subtitle="Players active in the selected window."
      path="/api/v1/admin/bo/players-online"
      fields={FIELDS}
      columns={COLUMNS}
      tableTitle="Online Players List"
      emptyMessage="No players online"
      emptyHint="Nobody has been active in this window."
    />
  );
}
