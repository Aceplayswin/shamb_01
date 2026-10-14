'use client';

/** Bonus List — reference screen `/bonuslist`. */

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button, StatusBadge } from '@/components/admin/AdminShell';
import { SearchPage, col } from '@/components/admin/Backoffice';

const FIELDS = [
  { name: 'bonusCode', label: 'Bonus Code' },
  { name: 'bonusName', label: 'Bonus Name' },
  {
    name: 'bonusType',
    label: 'Bonus Type',
    type: 'select',
    options: [
      { value: '', label: 'Select Bonus Type' },
      { value: 'joining', label: 'Joining' },
      { value: 'deposit', label: 'Deposit' },
      { value: 'referral', label: 'Referral' },
      { value: 'game', label: 'Game' },
      { value: 'cashback', label: 'Cashback' },
      { value: 'no_deposit', label: 'No deposit' },
      { value: 'free_spins', label: 'Free spins' },
      { value: 'loyalty', label: 'Loyalty' },
      { value: 'reload', label: 'Reload' },
      { value: 'manual', label: 'Manual' },
    ],
  },
  {
    name: 'redemptionType',
    label: 'Bonus Redemption Type',
    type: 'select',
    options: [
      { value: '', label: 'Select Bonus Redemption Type' },
      { value: 'coupon', label: 'Coupon' },
      { value: 'deposit', label: 'Deposit' },
      { value: 'automatic', label: 'Automatic' },
      { value: 'manual', label: 'Manual' },
    ],
  },
  { name: 'affiliateId', label: 'Affiliate ID' },
];

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('bonus_name', 'Bonus Name'),
  col.text('bonus_code', 'Bonus Code'),
  col.text('bonus_type', 'Type'),
  col.text('redemption_type', 'Redemption'),
  col.date('start_date', 'Start Date'),
  col.date('end_date', 'End Date'),
  col.number('priority', 'Priority'),
  {
    key: 'is_published',
    label: 'Published',
    render: (r) => (r.is_published ? 'Yes' : 'No'),
  },
  {
    key: 'is_new_player_only',
    label: 'Old Players',
    render: (r) =>
      !r.is_new_player_only
        ? 'Included'
        : r.new_player_days > 0
          ? `Excluded (> ${r.new_player_days}d old)`
          : 'Excluded (pre-launch)',
  },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  col.money('total_awarded', 'Awarded'),
];

export default function BonusListPage() {
  return (
    <SearchPage
      title="Bonus List"
      subtitle="Every bonus definition on the platform."
      path="/api/v1/admin/bo/bonuses"
      fields={FIELDS}
      columns={COLUMNS}
      tableTitle="Bonus List"
      headerActions={
        <Link href="/bonus/create">
          <Button icon={PlusCircle}>Create Bonus</Button>
        </Link>
      }
    />
  );
}
