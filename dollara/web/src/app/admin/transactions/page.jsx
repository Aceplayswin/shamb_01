'use client';

import { useState } from 'react';
import { Receipt, Check, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Select,
  Button,
  Modal,
  Field,
  Textarea,
  confirmDialog,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const ACTIONABLE_TYPES = ['deposit', 'withdrawal'];
const ACTIONABLE_STATUSES = ['pending', 'processing'];

export default function AdminTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const query = `/api/v1/admin/transactions?limit=200${typeFilter ? `&type=${typeFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`;
  const { data: txs, loading, reload, setData } = useAdminData(query, [typeFilter, statusFilter]);

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
