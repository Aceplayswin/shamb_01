'use client';

/**
 * Front End Configuration Rules — reference screens
 * `/frontendconfigurationrules` and `/frontendpaymentmethod`.
 */

import CrudPage from '@/components/admin/CrudPage';
import { StatusBadge } from '@/components/admin/AdminShell';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('method', 'Payment Method'),
  col.text('country_code', 'Country'),
  col.text('currency', 'Currency'),
  col.money('min_amount', 'Min'),
  col.money('max_amount', 'Max'),
  col.number('display_order', 'Order'),
  {
    key: 'is_visible',
    label: 'Visible',
    render: (r) => <StatusBadge status={r.is_visible ? 'active' : 'inactive'} />,
  },
];

const FORM = [
  { name: 'method_id', label: 'Payment method ID', type: 'number' },
  { name: 'country_code', label: 'Country code', placeholder: 'IN' },
  { name: 'currency', label: 'Currency', placeholder: 'INR' },
  { name: 'min_amount', label: 'Min amount', type: 'number', default: '0' },
  { name: 'max_amount', label: 'Max amount', type: 'number' },
  { name: 'display_order', label: 'Display order', type: 'number', default: '0' },
  { name: 'is_visible', label: 'Visible', type: 'toggle', default: true },
];

export default function FrontendRulesPage() {
  return (
    <CrudPage
      title="Front End Configuration Rules"
      subtitle="Control which payment methods appear in the cashier, and in what order."
      path="/api/v1/admin/bo/frontend-rules"
      createPath="/api/v1/admin/bo/frontend-rules/create"
      columns={COLUMNS}
      formFields={FORM}
      tableTitle="Front End Rules"
      createLabel="Add rule"
    />
  );
}
