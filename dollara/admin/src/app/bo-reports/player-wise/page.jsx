'use client';

/** Player Wise Report — reference report `player-wise`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('player', 'Player (ID)'),
  col.date('signup_date', 'Signup Date'),
  col.itz('signup_date'),
  col.text('country', 'Country'),
  col.money('deposits', 'Deposits'),
  col.money('withdrawals', 'Withdrawals'),
  col.money('total_bet', 'Total Bet'),
  col.money('total_won', 'Total Won'),
  col.signed('profit', 'Profit'),
  col.money('balance', 'Balance'),
];

export default function Page() {
  return (
    <ReportPage
      title="Player Wise Report"
      subtitle="Deposits, withdrawals and turnover per player."
      slug="player-wise"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Player Wise"
    />
  );
}
