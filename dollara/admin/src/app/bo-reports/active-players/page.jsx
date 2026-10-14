'use client';

/** Active Players Report — reference report `active-players`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('player', 'Player (ID)'),
  col.text('country', 'Country'),
  col.number('rounds', 'Rounds'),
  col.money('total_bet', 'Total Bet'),
  col.money('total_won', 'Total Won'),
  col.signed('profit', 'Profit'),
];

export default function Page() {
  return (
    <ReportPage
      title="Active Players Report"
      subtitle="Players who staked at least one round."
      slug="active-players"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Active Players"
    />
  );
}
