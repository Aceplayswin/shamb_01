'use client';

/** Bets Done — reference report `bets-done`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.date('date', 'Date'),
  col.itz('date'),
  col.text('player', 'Player (ID)'),
  col.text('game', 'Game'),
  col.money('bet', 'Bet'),
  col.money('won', 'Won'),
  col.signed('profit', 'Profit'),
  col.text('status', 'Status'),
];

export default function Page() {
  return (
    <ReportPage
      title="Bets Done"
      subtitle="Every settled round over the period."
      slug="bets-done"
      fields={[...PERIOD_FIELDS, { name: 'playerId', label: 'Player ID' }]}
      columns={COLUMNS}
      tableTitle="Bets Done"
    />
  );
}
