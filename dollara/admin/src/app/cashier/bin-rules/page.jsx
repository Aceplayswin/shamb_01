'use client';

/** Payment Provider Bin Rules — reference screen `/paymentproviderbinrules`. */

import CrudPage from '@/components/admin/CrudPage';
import { StatusBadge } from '@/components/admin/AdminShell';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('provider', 'Provider'),
  col.text('bin_from', 'BIN From'),
  col.text('bin_to', 'BIN To'),
  col.text('card_brand', 'Card Brand'),
  col.text('country_code', 'Country'),
  col.text('action', 'Action'),
  col.number('priority', 'Priority'),
  {
    key: 'is_active',
    label: 'Status',
    render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
  },
];

const FORM = [
  { name: 'bin_from', label: 'BIN from', required: true, placeholder: '400000' },
  { name: 'bin_to', label: 'BIN to', placeholder: '499999' },
  { name: 'provider_id', label: 'Provider ID', type: 'number' },
  { name: 'card_brand', label: 'Card brand', placeholder: 'VISA' },
  { name: 'country_code', label: 'Country code', placeholder: 'IN' },
  {
    name: 'action',
    label: 'Action',
    type: 'select',
    default: 'allow',
    options: [
      { value: 'allow', label: 'Allow' },
      { value: 'deny', label: 'Deny' },
      { value: 'route', label: 'Route' },
    ],
  },
  { name: 'priority', label: 'Priority', type: 'number', default: '0' },
  { name: 'is_active', label: 'Active', type: 'toggle', default: true },
];

export default function BinRulesPage() {
  return (
    <CrudPage
      title="Payment Provider Bin Rules"
      subtitle="Route or block card BIN ranges."
      path="/api/v1/admin/bo/bin-rules"
      createPath="/api/v1/admin/bo/bin-rules/create"
      filterFields={[{ name: 'bin', label: 'BIN' }]}
      columns={COLUMNS}
      formFields={FORM}
      tableTitle="Bin Rules"
      createLabel="Add BIN rule"
    />
  );
}
