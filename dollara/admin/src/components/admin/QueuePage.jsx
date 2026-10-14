'use client';

/**
 * Cashier queue screen — reference `/decline-queue` and
 * `/profile-upgrade-queue`. Both are the same screen with a different label.
 */

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  StatusBadge,
  confirmDialog,
  toast,
  fmtDate,
} from '@/components/admin/AdminShell';
import {
  FilterPanel,
  ResultTable,
  useBackofficeData,
  col,
} from '@/components/admin/Backoffice';

const FIELDS = [
  { name: 'playerId', label: 'Player ID' },
  { name: 'dateFrom', label: 'Period from', type: 'date' },
  { name: 'dateTo', label: 'Period to', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

const BLANK = FIELDS.reduce((a, f) => ({ ...a, [f.name]: '' }), {});

export default function QueuePage({ queueType, title, subtitle }) {
  const [draft, setDraft] = useState(BLANK);
  const [applied, setApplied] = useState(BLANK);
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useBackofficeData(
    `/api/v1/admin/bo/queues/${queueType}`,
    applied,
    { page, pageSize: 25 },
  );

  const resolve = async (row, status) => {
    const ok = await confirmDialog({
      title: status === 'approved' ? 'Approve this item?' : 'Reject this item?',
      text: `${row.player || 'This player'} — ${row.reason || 'no reason recorded'}.`,
      confirmText: status === 'approved' ? 'Approve' : 'Reject',
      icon: 'question',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/bo/queues/items/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Item ${status}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    col.text('player', 'Player (ID)'),
    col.money('amount', 'Amount'),
    col.text('currency', 'Currency'),
    col.text('reason', 'Reason'),
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'resolved_at', label: 'Resolved', render: (r) => fmtDate(r.resolved_at) },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.status === 'pending' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" icon={Check} onClick={() => resolve(r, 'approved')}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => resolve(r, 'rejected')}>
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="space-y-5">
        <FilterPanel
          fields={FIELDS}
          values={draft}
          onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))}
          onSearch={() => {
            setPage(0);
            setApplied(draft);
          }}
          onClear={() => {
            setDraft(BLANK);
            setApplied(BLANK);
            setPage(0);
          }}
          busy={loading}
        />
        <ResultTable
          title={title}
          columns={columns}
          rows={data?.rows}
          loading={loading}
          error={error}
          onRetry={reload}
          total={data?.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
        />
      </div>
    </AdminShell>
  );
}
