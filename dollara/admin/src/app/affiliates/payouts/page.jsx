'use client';

import { useState } from 'react';
import { 
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  confirmDialog,
  toast,
  fmtDate,
  Modal,
  Field,
  Input,
  Textarea
} from '@/components/admin/AdminShell';
import {
  ErrorState,
  StatCard,
  inr,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';
import { Check, X, Wallet, Clock, CheckCircle2 } from 'lucide-react';

export default function PayoutApprovalsPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/affiliates/payouts?limit=200',
    [],
  );
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [approveData, setApproveData] = useState(null);
  const [rejectData, setRejectData] = useState(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const requests = data?.records ?? [];
  const summary = data?.summary;

  /**
   * Bulk actions go through one endpoint that handles each payout
   * independently, so one failure (an already-paid row, say) reports itself
   * without voiding the rest of the batch.
   */
  const runBulk = async (action, extra = {}) => {
    if (selectedIds.length === 0) return;

    const labels = {
      approve: ['Approve selected payouts?', 'Approve'],
      pay: ['Mark selected payouts as paid?', 'Mark paid'],
      reject: ['Reject selected payouts?', 'Reject'],
    };
    const [title, confirmText] = labels[action];

    const ok = await confirmDialog({
      title,
      text: `${selectedIds.length} request${selectedIds.length === 1 ? '' : 's'} selected. `
        + (action === 'pay'
          ? 'Only do this once the transfers have actually been sent.'
          : action === 'reject'
            ? 'The commission returns to each affiliate\'s available balance.'
            : 'They move to approved and can then be marked paid.'),
      confirmText,
      danger: action === 'reject',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const result = await adminApi('/api/v1/admin/affiliates/payouts/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, action, ...extra }),
      });
      if (result.failed_count) {
        toast.error(
          `${result.succeeded_count} done, ${result.failed_count} failed: `
          + result.failed.map((f) => f.error).join('; '),
        );
      } else {
        toast.success(`${result.succeeded_count} payouts updated`);
      }
      setSelectedIds([]);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const approvePayout = async (row) => {
    const ok = await confirmDialog({
      title: 'Approve this payout?',
      text: `${inr(row.amount)} to ${row.affiliate_name}. Approving signs it off; `
        + 'money moves when you mark it paid.',
      confirmText: 'Approve',
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/affiliates/payouts/${row.id}/approve`, {
        method: 'POST',
      });
      toast.success('Payout approved');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitPaid = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/affiliates/payouts/${approveData.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });
      toast.success('Payout marked as paid');
      setApproveData(null);
      setReference('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/affiliates/payouts/${rejectData.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      toast.success('Payout rejected — the commission is available again');
      setRejectData(null);
      setReason('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'affiliate_name', label: 'Affiliate', render: (r) => (
      <div>
        <p className="font-medium text-white">{r.affiliate_name}</p>
        <p className="text-xs text-amber-400">{r.tier_label} · {r.affiliate_code}</p>
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (r) => (
      <div>
        <p className="font-bold text-emerald-400">{inr(r.amount)}</p>
        <p className="text-xs text-slate-500">{r.entry_count} ledger entries</p>
      </div>
    )},
    { key: 'method_label', label: 'Payout Method', render: (r) => (
      <div>
        <p className="text-slate-300">{r.method_label}</p>
        <p className="font-mono text-xs text-slate-500">{r.method_details}</p>
      </div>
    )},
    { key: 'requested_at', label: 'Requested', render: (r) => fmtDate(r.requested_at) },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'requested', label: 'Requested' },
        { value: 'approved', label: 'Approved' },
        { value: 'paid', label: 'Paid' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    { key: 'actions', label: '', render: (r) => (
      r.status === 'requested' || r.status === 'approved' ? (
        <div className="flex justify-end gap-2">
          {r.status === 'requested' && (
            <Button variant="secondary" size="sm" onClick={() => approvePayout(r)}>
              Approve
            </Button>
          )}
          <Button
            variant="success"
            size="sm"
            icon={Check}
            onClick={() => setApproveData(r)}
            title="Mark as paid"
          >
            Mark paid
          </Button>
          <Button variant="danger" size="sm" icon={X} onClick={() => setRejectData(r)} />
        </div>
      ) : (
        <div className="text-right font-mono text-xs text-slate-500">
          {r.reference ? `Ref: ${r.reference}` : r.rejection_reason || '—'}
        </div>
      )
    )}
  ];

  if (error) {
    return (
      <AdminShell title="Payout Approvals">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Payout Approvals"
      subtitle="Review and release affiliate withdrawal requests"
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting review"
          value={summary?.pending_count ?? 0}
          icon={Clock}
          accent="brand"
        />
        <StatCard
          label="Pending amount"
          value={inr(summary?.pending_amount ?? 0)}
          icon={Wallet}
          accent="indigo"
        />
        <StatCard
          label="Paid this month"
          value={inr(summary?.paid_this_month ?? 0)}
          icon={CheckCircle2}
          accent="emerald"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          {/* Selection is per-page, because the table pages client-side and a
              silent "select all across every page" is not what anyone means. */}
          <span className="text-sm font-medium text-slate-300">
            {selectedIds.length} selected on this page
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" busy={busy} onClick={() => runBulk('approve')}>
              Approve all
            </Button>
            <Button
              variant="success"
              size="sm"
              busy={busy}
              onClick={() => {
                const ref = window.prompt('Transfer reference for these payouts');
                if (ref) runBulk('pay', { reference: ref });
              }}
            >
              Mark all paid
            </Button>
            <Button
              variant="danger"
              size="sm"
              busy={busy}
              onClick={() => {
                const why = window.prompt('Reason (shown to each affiliate)');
                if (why) runBulk('reject', { reason: why });
              }}
            >
              Reject all
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={requests}
        loading={loading}
        searchable
        searchKeys={['affiliate_name', 'affiliate_code', 'reference']}
        searchPlaceholder="Search by affiliate or reference…"
        noun="payout"
        pageSize={20}
        emptyIcon={Wallet}
        emptyMessage="No payout requests"
        emptyHint="Requests appear here once affiliates withdraw approved commission."
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Approve Modal */}
      {/* `open`, not `isOpen` — with the wrong prop name Modal read undefined
          and returned null, so these buttons appeared to do nothing at all. */}
      <Modal
        open={!!approveData}
        onClose={() => !busy && setApproveData(null)}
        title="Mark Payout as Paid"
      >
        {approveData && (
          <form onSubmit={submitPaid} className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-emerald-400">
                Amount to pay: {inr(approveData.amount)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {approveData.method_label} ({approveData.method_details})
              </p>
            </div>
            <p className="text-sm text-slate-300">
              Please manually process the payment using the details above. Once paid, enter the transaction reference to mark it as complete.
            </p>
            {/* Required by the API: a payout marked paid with no reference is
                unreconcilable the moment anyone disputes it. */}
            <Field label="Transaction reference">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. NEFT-123456"
                disabled={busy}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setApproveData(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="success" busy={busy}>Confirm Paid</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectData}
        onClose={() => !busy && setRejectData(null)}
        title="Reject Payout"
      >
        {rejectData && (
          <form onSubmit={submitReject} className="space-y-4">
            <p className="text-sm text-slate-300">
              Rejecting returns {inr(rejectData.amount)} to {rejectData.affiliate_name}&apos;s
              available balance so they can request it again.
            </p>
            <Field label="Rejection Reason (sent to affiliate)">
              <Textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Invalid bank details provided"
                disabled={busy}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setRejectData(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="danger" busy={busy}>Reject Payout</Button>
            </div>
          </form>
        )}
      </Modal>

    </AdminShell>
  );
}
