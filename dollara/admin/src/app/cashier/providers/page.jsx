'use client';

/**
 * Payment Providers — reference screens `/registerpaymentprovider` and
 * `/paymentproviderslist` merged into one page.
 */

import CrudPage from '@/components/admin/CrudPage';
import { StatusBadge } from '@/components/admin/AdminShell';
import { col } from '@/components/admin/Backoffice';

const COLUMNS = [
  col.number('id', 'ID'),
  col.text('name', 'Name'),
  col.text('code', 'Code'),
  col.text('api_endpoint', 'API Endpoint'),
  {
    key: 'supports_deposit',
    label: 'Deposit',
    render: (r) => (r.supports_deposit ? 'Yes' : 'No'),
  },
  {
    key: 'supports_withdrawal',
    label: 'Withdrawal',
    render: (r) => (r.supports_withdrawal ? 'Yes' : 'No'),
  },
  col.text('currencies', 'Currencies'),
  {
    key: 'is_active',
    label: 'Status',
    render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
  },
];

const FORM = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'api_endpoint', label: 'API endpoint', full: true },
  { name: 'currencies', label: 'Currencies', placeholder: 'INR,USD' },
  { name: 'deposit_countries', label: 'Deposit countries', placeholder: 'IN,NP' },
  { name: 'withdrawal_countries', label: 'Withdrawal countries' },
  { name: 'supports_deposit', label: 'Supports deposit', type: 'toggle', default: true },
  { name: 'supports_withdrawal', label: 'Supports withdrawal', type: 'toggle', default: false },
  { name: 'is_active', label: 'Active', type: 'toggle', default: true },
];

export default function PaymentProvidersPage() {
  return (
    <CrudPage
      title="Payment Providers"
      subtitle="Register a payment provider and review the existing list."
      path="/api/v1/admin/bo/payment-providers"
      createPath="/api/v1/admin/bo/payment-providers/create"
      filterFields={[{ name: 'name', label: 'Name' }]}
      columns={COLUMNS}
      formFields={FORM}
      tableTitle="Payment Provider List"
      createLabel="Register provider"
    />
  );
}
