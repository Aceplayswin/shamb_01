'use client';

import { useState } from 'react';
import { Receipt, Check, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  TxReference,
  Button,
  Modal,
  Field,
  Textarea,
  confirmDialog,
  toast,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';

const ACTIONABLE_TYPES = ['deposit', 'withdrawal'];
const ACTIONABLE_STATUSES = ['pending', 'processing'];

export default function AdminTransactionsPage() {
  const { data: txs, loading, reload, setData } = useAdminData(
    '/api/v1/admin/transactions?limit=200',
    [],
  );

  const [busyId, setBusyId] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  const approve = async (row) => {
    const ok = await confirmDialog({
      title: row.type === 'deposit' ? 'Confirm deposit?' : 'Approve withdrawal?',
      text:
        row.type === 'deposit'
          ? `Credit ${inr(row.amount)} to ${row.full_name || row.username}'s wallet.`
          : `Approve payout of ${inr(row.amount)} to ${row.full_name || row.username}.`,
      confirmText: 'Approve',
      icon: 'question',
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      if (row.type === 'deposit') {
        await adminApi(`/api/v1/admin/deposits/${row.id}/confirm`, {
          method: 'POST',
          body: JSON.stringify({ referenceNumber: `ADMIN-${Date.now()}` }),
        });
      } else {
        await adminApi(`/api/v1/admin/withdrawals/${row.id}/approve`, { method: 'POST' });
      }
      toast.success(row.type === 'deposit' ? 'Deposit credited' : 'Withdrawal approved');
      setData((prev) => prev?.map((t) => (t.id === row.id ? { ...t, status: 'completed' } : t)) ?? []);
    } catch (e) {
      toast.error(e.message);
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    setRejectBusy(true);
    try {
      if (rejectRow.type === 'deposit') {
        await adminApi(`/api/v1/admin/deposits/${rejectRow.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: rejectReason }),
        });
      } else {
        await adminApi(`/api/v1/admin/withdrawals/${rejectRow.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: rejectReason }),
        });
      }
      toast.success(
        rejectRow.type === 'deposit' ? 'Deposit rejected' : 'Withdrawal rejected & funds returned'
      );
      setData((prev) => prev?.map((t) => (t.id === rejectRow.id ? { ...t, status: 'rejected' } : t)) ?? []);
      setRejectRow(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRejectBusy(false);
    }
  };

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
      filter: 'select',
      filterOptions: [
        { value: 'deposit', label: 'Deposit' },
        { value: 'withdrawal', label: 'Withdrawal' },
        { value: 'adjustment', label: 'Adjustment' },
        { value: 'bonus_credit', label: 'Bonus credit' },
        { value: 'bet_settlement', label: 'Bet settlement' },
      ],
    },
    { key: 'reference_number', label: 'Reference', sortable: false, render: (r) => <TxReference transaction={r} /> },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className={r.type === 'withdrawal' ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
          {r.type === 'withdrawal' ? '−' : '+'}{inr(r.amount)}
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
      key: 'payment_method',
      label: 'Method',
      render: (r) => r.payment_method || '—',
      filter: 'select',
      filterLabel: 'Payment method',
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
            <p className="text-slate-200">{dt.toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
            <p className="text-xs text-slate-500">{dt.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</p>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        ACTIONABLE_TYPES.includes(r.type) && ACTIONABLE_STATUSES.includes(r.status) ? (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="success"
              size="sm"
              icon={Check}
              disabled={busyId === r.id}
              onClick={() => approve(r)}
            >
              {busyId === r.id ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={X}
              disabled={busyId === r.id}
              onClick={() => setRejectRow(r)}
            >
              Reject
            </Button>
          </div>
        ) : null,
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
        searchKeys={['username', 'full_name', 'reference_number', 'payment_method']}
        searchPlaceholder="Search transactions…"
        noun="transaction"
        pageSize={20}
        emptyIcon={Receipt}
        emptyMessage="No transactions"
      />

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title={rejectRow?.type === 'deposit' ? 'Reject deposit' : 'Reject withdrawal'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="tx-reject-form" type="submit" disabled={rejectBusy}>
              {rejectBusy
                ? 'Rejecting…'
                : rejectRow?.type === 'deposit'
                ? 'Reject'
                : 'Reject & refund'}
            </Button>
          </>
        }
      >
        <form id="tx-reject-form" onSubmit={submitReject} className="space-y-4">
          <p className="text-sm text-slate-400">
            {rejectRow?.type === 'deposit'
              ? `Rejecting marks this ${inr(rejectRow?.amount)} deposit as rejected without crediting the wallet.`
              : `Rejecting returns ${inr(rejectRow?.amount)} to the player's main balance.`}
          </p>
          <Field label="Reason (optional)">
            <Textarea
              rows={3}
              placeholder="e.g. KYC mismatch"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
