'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Select,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const query = `/api/v1/admin/transactions?limit=200${typeFilter ? `&type=${typeFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`;
  const { data: txs, loading } = useAdminData(query, [typeFilter, statusFilter]);

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
    {
      key: 'username',
      label: 'User',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.full_name || r.username}</p>
          <p className="text-xs text-slate-500">{r.username}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => <span className="capitalize text-slate-300">{r.type.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className={r.type === 'withdrawal' ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
          {r.type === 'withdrawal' ? '−' : '+'}{inr(r.amount)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment_method', label: 'Method', render: (r) => r.payment_method || '—' },
    { key: 'reference_number', label: 'Reference', render: (r) => r.reference_number || '—' },
  ];

  return (
    <AdminShell title="Transactions" subtitle="All deposits, withdrawals and adjustments">
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-[180px]">
          <option value="">All types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="adjustment">Adjustment</option>
          <option value="bonus_credit">Bonus credit</option>
          <option value="bet_settlement">Bet settlement</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[180px]">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={txs}
        loading={loading}
        searchable
        searchKeys={['username', 'full_name', 'reference_number', 'payment_method']}
        searchPlaceholder="Search transactions…"
        pageSize={20}
        emptyIcon={Receipt}
        emptyMessage="No transactions"
      />
    </AdminShell>
  );
}
