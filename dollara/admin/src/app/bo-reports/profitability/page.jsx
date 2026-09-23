'use client';

/** Games Profitability — reference report `profitability`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('game', 'Game'),
  col.number('rounds', 'Rounds'),
  col.money('total_bet', 'Total Bet'),
  col.money('total_won', 'Total Won'),
  col.signed('profit', 'Profit'),
  col.percent('margin_percent', 'Margin'),
];

export default function Page() {
  return (
    <ReportPage
      title="Games Profitability"
      subtitle="Games ranked by the profit they generate."
      slug="profitability"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Profitability"
    />
  );
}
