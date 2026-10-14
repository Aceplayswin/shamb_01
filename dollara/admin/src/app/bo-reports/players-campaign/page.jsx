'use client';

/** Players Campaign — reference report `playercampaignreport`. */

import ReportPage, { PERIOD_FIELDS } from '../ReportPage';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.text('campaign', 'Campaign'),
  col.number('affiliate_id', 'Affiliate ID'),
  col.number('players', 'Players'),
  col.money('deposits', 'Deposits'),
  col.money('total_bet', 'Total Bet'),
  col.signed('profit', 'Profit'),
];

export default function Page() {
  return (
    <ReportPage
      title="Players Campaign"
      subtitle="Signups and value grouped by acquisition campaign."
      slug="players-campaign"
      fields={PERIOD_FIELDS}
      columns={COLUMNS}
      tableTitle="Players Campaign"
    />
  );
}
