'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  Field,
  Select,
  StatusBadge,
  TxReference,
  toast,
  inr,
  fmtDateOnly,
  fmtTime,
} from '@/components/admin/AdminShell';

const TYPE_OPTIONS = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'bonus_credit', label: 'Bonus credit' },
  { value: 'bet_settlement', label: 'Bet settlement' },
  { value: 'refund', label: 'Refund' },
];

// Transaction.amount is stored unsigned (game_services writes abs(net)), so the
// direction of the money has to be derived. Withdrawals always leave the
// wallet; a bet settlement's direction survives only in `notes` ('Win'/'Loss').
const isOutgoing = (r) =>
  r.type === 'withdrawal' ||
  (r.type === 'bet_settlement' && r.notes === 'Loss');

// A read-only ledger: pending deposits and withdrawals are approved or rejected
// on the Deposits and Withdrawals pages, so this page only reports each row
// and its status.
export default function AdminTransactionsPage() {
  const [type, setType] = useState('');
  const [txs, setTxs] = useState(null);
  const [loading, setLoading] = useState(true);

  // Only the newest 200 rows are loaded, and bet settlements land every few
  // seconds, so filtering that window by type on the client rarely finds a
  // deposit or withdrawal. The type goes to the API instead, which returns the
  // newest 200 rows of that type.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (type) params.set('type', type);
    adminApi(`/api/v1/admin/transactions?${params}`)
      .then((res) => active && setTxs(res))
      .catch((e) => active && toast.error(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [type]);

  const columns = [
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
    { key: 'reference_number', label: 'Reference', sortable: false, render: (r) => <TxReference transaction={r} /> },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className={isOutgoing(r) ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
          {isOutgoing(r) ? '−' : '+'}{inr(r.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'failed', label: 'Failed' },
      ],
    },
    {
      // What a bet settlement was actually played on — a reference number alone
      // meant looking the round up by hand to answer "which game was this?".
      key: 'game_name',
      label: 'Game',
      sortable: false,
      render: (r) =>
        r.game_name ? (
          <div className="whitespace-nowrap">
            <p className="text-slate-200">{r.game_name}</p>
            {r.game_category && (
              <p className="text-xs capitalize text-slate-500">
                {r.game_category.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'created_at',
      label: 'Date',
      filter: 'date',
      render: (r) => {
        if (!r.created_at) return '—';
        const dt = new Date(r.created_at);
        return (
          <div className="whitespace-nowrap">
            <p className="text-slate-200">{fmtDateOnly(dt)}</p>
            <p className="text-xs text-slate-500">{fmtTime(dt)}</p>
          </div>
        );
      },
    },
    {
      // When the row reached its final state (deposit approved, bet settled),
      // shown beside the created time so reports can age a pending item.
      key: 'settled_at',
      label: 'Settled',
      sortable: false,
      render: (r) => {
        if (!r.settled_at) return '—';
        const dt = new Date(r.settled_at);
        return (
          <div className="whitespace-nowrap">
            <p className="text-slate-200">{fmtDateOnly(dt)}</p>
            <p className="text-xs text-slate-500">{fmtTime(dt)}</p>
          </div>
        );
      },
    },
  ];

  return (
    <AdminShell title="Transactions" subtitle="All deposits, withdrawals and adjustments">
      <DataTable
        columns={columns}
        rows={txs}
        loading={loading}
        searchable
        filterSubtitle="Combine any filters to narrow the list"
        filterActive={!!type}
        onFilterClear={() => setType('')}
        filters={
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        }
        searchKeys={['username', 'full_name', 'reference_number']}
        searchPlaceholder="Search transactions…"
        noun="transaction"
        pageSize={20}
        emptyIcon={Receipt}
        emptyMessage="No transactions"
      />
    </AdminShell>
  );
}
