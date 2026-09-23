'use client';

/** Jackpot contribution — reference report `jackpotcontribution`. */

import { inr } from '@/components/admin/AdminShell';
import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('game', 'Game'),
  col.number('rounds', 'Rounds'),
  col.money('total_bet', 'Total Bet'),
  col.money('contribution', 'Contribution'),
];

export default function Page() {
  return (
    <ReportPage
      title="Jackpot Contribution"
      subtitle="The slice of each stake that feeds the jackpot pool."
      slug="jackpot-contribution"
      fields={PERIOD_FIELDS}
      totals={[
        { label: 'Contribution Rate', value: (d) => `${d?.contribution_rate ?? 0}%` },
        { label: 'Total Bet', value: (d) => inr(d?.total_bet) },
        { label: 'Total Contribution', value: (d) => inr(d?.total_contribution) },
      ]}
      columns={COLUMNS}
      tableTitle="By Game"
    />
  );
}
