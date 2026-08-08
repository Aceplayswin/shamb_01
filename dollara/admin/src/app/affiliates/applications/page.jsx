'use client';

import { useState } from 'react';
import { Inbox, Check, X, Info } from 'lucide-react';
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
  fmtDate,
} from '@/components/admin/AdminShell';
import { mockApplications } from '@/lib/affiliateMockData';

export default function AffiliateApplicationsPage() {
  const [items, setItems] = useState(mockApplications);
  const [loading, setLoading] = useState(false);
  
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async (row) => {
    const ok = await confirmDialog({
      title: 'Approve application?',
      text: `This will create an affiliate account for ${row.name}.`,
      confirmText: 'Approve',
      icon: 'question',
    });
    if (!ok) return;
    
    // Mock approve action
    setItems((prev) => prev.map((app) => app.id === row.id ? { ...app, status: 'approved' } : app));
    toast.success('Application approved');
  };

  const reject = async (e) => {
    e.preventDefault();
    setBusy(true);
    // Mock reject action
    setTimeout(() => {
      setItems((prev) => prev.map((app) => app.id === rejectRow.id ? { ...app, status: 'rejected', notes: rejectReason } : app));
      toast.success('Application rejected');
      setRejectRow(null);
      setRejectReason('');
      setBusy(false);
    }, 500);
  };

  const requestInfo = async (row) => {
    const ok = await confirmDialog({
      title: 'Request more info?',
      text: `An email will be sent to ${row.email} requesting additional details.`,
      confirmText: 'Send Request',
      icon: 'info',
    });
    if (!ok) return;
    
    // Mock request info action
    setItems((prev) => prev.map((app) => app.id === row.id ? { ...app, status: 'info_requested' } : app));
    toast.success('Info requested');
  };

  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.name}</p>
          <p className="text-xs text-slate-500">{r.company || 'No company'}</p>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (r) => <span className="text-slate-400">{r.email}</span> },
    { key: 'traffic_source', label: 'Traffic Source', render: (r) => <span className="text-slate-300">{r.traffic_source}</span> },
    { key: 'expected_volume', label: 'Volume', render: (r) => <span className="text-slate-400">{r.expected_volume}</span> },
    { key: 'applied_at', label: 'Date', render: (r) => fmtDate(r.applied_at), filter: 'date' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'info_requested', label: 'Info Requested' },
      ],
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.status === 'pending' && (
            <>
              <Button variant="success" size="sm" icon={Check} onClick={() => approve(r)}>
                Approve
              </Button>
              <Button variant="danger" size="sm" icon={X} onClick={() => setRejectRow(r)}>
                Reject
              </Button>
              <Button variant="ghost" size="sm" icon={Info} onClick={() => requestInfo(r)}>
                Request Info
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = items.filter(a => a.status === 'pending').length;

  return (
    <AdminShell 
      title="Applications" 
      subtitle={`${pendingCount} pending review`}
    >
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['name', 'email', 'company']}
        searchPlaceholder="Search by name, email, company…"
        noun="application"
        pageSize={15}
        emptyIcon={Inbox}
        emptyMessage="No pending applications"
        emptyHint="New affiliate applications will appear here."
      />

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject Application"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-form" type="submit" disabled={busy}>
              {busy ? 'Rejecting…' : 'Reject'}
            </Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting application from <span className="font-semibold text-white">{rejectRow?.name}</span> ({rejectRow?.company || 'No company'}).
          </p>
          <Field label="Rejection reason (optional)">
            <Textarea
              rows={3}
              placeholder="e.g. Does not meet traffic requirements"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
