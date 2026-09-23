'use client';

/** Providers Expense — reference report `providers-expense`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('provider', 'Provider'),
  col.number('rounds', 'Rounds'),
  col.money('total_bet', 'Total Bet'),
  col.money('total_won', 'Total Won'),
  col.signed('profit', 'Profit'),
];

export default function Page() {
  return (
    <ReportPage
      title="Providers Expense"
      subtitle="Turnover and house profit per game provider."
      slug="providers-expense"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Providers Expense"
    />
  );
}
