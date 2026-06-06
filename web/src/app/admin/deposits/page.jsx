'use client';

import { useState } from 'react';
import { ArrowDownToLine, Check } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  confirmDialog,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminDepositsPage() {
  const { data: items, loading, reload, setData } = useAdminData('/api/v1/admin/deposits/pending');
  const [busyId, setBusyId] = useState(null);

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
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-emerald-400">{inr(r.amount)}</span> },
    { key: 'payment_method', label: 'Method', render: (r) => r.payment_method || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button variant="success" size="sm" icon={Check} disabled={busyId === r.id} onClick={() => confirm(r)}>
            {busyId === r.id ? 'Crediting…' : 'Confirm'}
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
        pageSize={15}
        emptyIcon={ArrowDownToLine}
        emptyMessage="No pending deposits"
        emptyHint="Confirmed deposits move to Transactions."
      />
    </AdminShell>
  );
}
