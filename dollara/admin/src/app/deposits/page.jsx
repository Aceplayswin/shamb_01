'use client';

import { useState } from 'react';
import { ArrowDownToLine, Check, X } from 'lucide-react';
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

export default function AdminDepositsPage() {
  const { data: items, loading, reload, setData } = useAdminData('/api/v1/admin/deposits/pending');
  const [busyId, setBusyId] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const confirm = async (row) => {
    const ok = await confirmDialog({
      title: 'Confirm deposit?',
      text: `Credit ${inr(row.amount)} to ${row.full_name || row.username}'s wallet.`,
      confirmText: 'Confirm & credit',
      icon: 'question',
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await adminApi(`/api/v1/admin/deposits/${row.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ referenceNumber: `ADMIN-${Date.now()}` }),
      });
      toast.success('Deposit credited');
      setData((prev) => prev?.filter((d) => d.id !== row.id) ?? []);
    } catch (e) {
      toast.error(e.message);
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    setRejecting(true);
    try {
      await adminApi(`/api/v1/admin/deposits/${rejectRow.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast.success('Deposit rejected — no funds credited');
      setData((prev) => prev?.filter((d) => d.id !== rejectRow.id) ?? []);
      setRejectRow(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRejecting(false);
    }
  };

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at), filter: 'date' },
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
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-emerald-400">{inr(r.amount)}</span> },
    {
      key: 'payment_method',
      label: 'Method',
      render: (r) => r.payment_method || '—',
      filter: 'select',
      filterLabel: 'Payment method',
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} />, filter: 'select' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="success" size="sm" icon={Check} disabled={busyId === r.id} onClick={() => confirm(r)}>
            {busyId === r.id ? 'Crediting…' : 'Confirm'}
          </Button>
          <Button variant="danger" size="sm" icon={X} disabled={busyId === r.id} onClick={() => setRejectRow(r)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell title="Pending Deposits" subtitle={`${items?.length ?? 0} awaiting confirmation`}>
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['username', 'full_name']}
        searchPlaceholder="Search deposits…"
        noun="deposit"
        pageSize={15}
        emptyIcon={ArrowDownToLine}
        emptyMessage="No pending deposits"
        emptyHint="Confirmed deposits move to Transactions."
      />

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject deposit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-deposit-form" type="submit" disabled={rejecting}>
              {rejecting ? 'Rejecting…' : 'Reject deposit'}
            </Button>
          </>
        }
      >
        <form id="reject-deposit-form" onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting marks this {inr(rejectRow?.amount)} deposit as rejected. No funds are credited.
          </p>
          <Field label="Reason (optional)">
            <Textarea
              rows={3}
              placeholder="e.g. Payment not received"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
