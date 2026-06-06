'use client';

import { useState } from 'react';
import { ArrowUpFromLine, Check, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
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

export default function AdminWithdrawalsPage() {
  const { data: items, loading, reload, setData } = useAdminData('/api/v1/admin/withdrawals/pending');
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async (row) => {
    const ok = await confirmDialog({
      title: 'Approve withdrawal?',
      text: `Approve payout of ${inr(row.amount)} to ${row.full_name || row.username}.`,
      confirmText: 'Approve',
      icon: 'question',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/withdrawals/${row.id}/approve`, { method: 'POST' });
      toast.success('Withdrawal approved');
      setData((prev) => prev?.filter((w) => w.id !== row.id) ?? []);
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/withdrawals/${rejectRow.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast.success('Withdrawal rejected & funds returned');
      setData((prev) => prev?.filter((w) => w.id !== rejectRow.id) ?? []);
      setRejectRow(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
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
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-rose-400">{inr(r.amount)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="success" size="sm" icon={Check} onClick={() => approve(r)}>
            Approve
          </Button>
          <Button variant="danger" size="sm" icon={X} onClick={() => setRejectRow(r)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell title="Pending Withdrawals" subtitle={`${items?.length ?? 0} awaiting review`}>
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['username', 'full_name']}
        searchPlaceholder="Search withdrawals…"
        pageSize={15}
        emptyIcon={ArrowUpFromLine}
        emptyMessage="No pending withdrawals"
        emptyHint="Approved payouts move to Transactions."
      />

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-form" type="submit" disabled={busy}>
              {busy ? 'Rejecting…' : 'Reject & refund'}
            </Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting returns {inr(rejectRow?.amount)} to the player&apos;s main balance.
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
