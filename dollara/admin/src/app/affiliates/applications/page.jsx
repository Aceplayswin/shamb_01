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
  Input,
  Select,
  Textarea,
  ErrorState,
  toast,
  fmtDate,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';

export default function AffiliateApplicationsPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/affiliates/applications?limit=200',
    [],
  );
  const { data: settings } = useAdminData('/api/v1/admin/affiliates/settings', []);

  const [approveRow, setApproveRow] = useState(null);
  const [terms, setTerms] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoRow, setInfoRow] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const items = data?.records ?? [];

  /**
   * Approval is the moment commercial terms are actually decided, so it opens a
   * form rather than a yes/no confirm. Defaults come from the programme
   * settings, and an invited sub-affiliate arrives with a proposed override the
   * reviewer can accept or change.
   */
  const openApprove = (row) => {
    setApproveRow(row);
    setTerms({
      commissionType: settings?.default_commission_type ?? 'revenue_share',
      commissionRate: settings?.default_commission_rate ?? 30,
      cpaAmount: settings?.default_cpa_amount ?? 500,
      overrideRate: row.proposed_override_rate || settings?.default_override_rate || 5,
      tierLabel: 'Bronze',
    });
  };

  const submitApprove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(
        `/api/v1/admin/affiliates/applications/${approveRow.id}/approve`,
        { method: 'POST', body: JSON.stringify(terms) },
      );
      toast.success(`${approveRow.name} approved`);
      setApproveRow(null);
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
      await adminApi(
        `/api/v1/admin/affiliates/applications/${rejectRow.id}/reject`,
        { method: 'POST', body: JSON.stringify({ reason: rejectReason }) },
      );
      toast.success('Application rejected');
      setRejectRow(null);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitRequestInfo = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(
        `/api/v1/admin/affiliates/applications/${infoRow.id}/request-info`,
        { method: 'POST', body: JSON.stringify({ message: infoMessage }) },
      );
      toast.success('Information requested');
      setInfoRow(null);
      setInfoMessage('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
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
    {
      key: 'parent_name',
      label: 'Referred by',
      render: (r) =>
        r.parent_name ? (
          <div>
            <p className="text-slate-300">{r.parent_name}</p>
            <p className="text-xs text-slate-500">{r.proposed_override_rate}% override</p>
          </div>
        ) : (
          <span className="text-slate-600">Direct</span>
        ),
    },
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
          {(r.status === 'pending' || r.status === 'info_requested') && (
            <>
              <Button variant="success" size="sm" icon={Check} onClick={() => openApprove(r)}>
                Approve
              </Button>
              <Button variant="danger" size="sm" icon={X} onClick={() => setRejectRow(r)}>
                Reject
              </Button>
              <Button variant="ghost" size="sm" icon={Info} onClick={() => setInfoRow(r)}>
                Request Info
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <AdminShell title="Applications" subtitle="Affiliate applications">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Applications"
      subtitle={`${data?.summary?.pending ?? 0} pending review`}
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
        open={!!approveRow}
        onClose={() => setApproveRow(null)}
        title="Approve application"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveRow(null)}>
              Cancel
            </Button>
            <Button variant="success" form="approve-form" type="submit" busy={busy}>
              Approve
            </Button>
          </>
        }
      >
        <form id="approve-form" onSubmit={submitApprove} className="space-y-4">
          <p className="text-sm text-slate-400">
            Approving <span className="font-semibold text-white">{approveRow?.name}</span>.
            They will be able to sign in and finish onboarding immediately.
          </p>

          {terms && (
            <>
              <Field label="Commission type">
                <Select
                  value={terms.commissionType}
                  onChange={(e) => setTerms({ ...terms, commissionType: e.target.value })}
                >
                  <option value="revenue_share">Revenue share</option>
                  <option value="cpa">CPA</option>
                  <option value="hybrid">Hybrid (CPA + revenue share)</option>
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                {terms.commissionType !== 'cpa' && (
                  <Field label="Revenue share %">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={terms.commissionRate}
                      onChange={(e) => setTerms({ ...terms, commissionRate: e.target.value })}
                    />
                  </Field>
                )}

                {terms.commissionType !== 'revenue_share' && (
                  <Field label="CPA amount (₹)">
                    <Input
                      type="number"
                      min="0"
                      value={terms.cpaAmount}
                      onChange={(e) => setTerms({ ...terms, cpaAmount: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tier">
                  <Select
                    value={terms.tierLabel}
                    onChange={(e) => setTerms({ ...terms, tierLabel: e.target.value })}
                  >
                    <option>Bronze</option>
                    <option>Silver</option>
                    <option>Gold</option>
                    <option>Platinum</option>
                  </Select>
                </Field>

                {/* What this affiliate's own parent earns on them, only
                    meaningful when they were invited by another partner. */}
                {approveRow?.parent_name && (
                  <Field label={`Override to ${approveRow.parent_name} (%)`}>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={terms.overrideRate}
                      onChange={(e) => setTerms({ ...terms, overrideRate: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={!!infoRow}
        onClose={() => setInfoRow(null)}
        title="Request more information"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInfoRow(null)}>
              Cancel
            </Button>
            <Button form="info-form" type="submit" busy={busy}>
              Send request
            </Button>
          </>
        }
      >
        <form id="info-form" onSubmit={submitRequestInfo} className="space-y-4">
          <p className="text-sm text-slate-400">
            {infoRow?.name} will see this message when they try to sign in.
          </p>
          <Field label="What do you need from them?">
            <Textarea
              rows={3}
              required
              placeholder="e.g. Please share example traffic sources and monthly volumes."
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject Application"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-form" type="submit" busy={busy}>
              Reject
            </Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={submitReject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting application from <span className="font-semibold text-white">{rejectRow?.name}</span> ({rejectRow?.company || 'No company'}).
          </p>
          {/* Required: the applicant is shown this, and "rejected, no reason"
              generates a support ticket every time. */}
          <Field label="Rejection reason">
            <Textarea
              rows={3}
              required
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
