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
  inr,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';

export default function AgentApplicationsPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/agents/applications?limit=200',
    [],
  );
  const { data: settings } = useAdminData('/api/v1/admin/agents/settings', []);
  // Every live account, so approval can place the applicant anywhere in the
  // tree rather than only under the upline code they happened to type.
  const { data: agents } = useAdminData('/api/v1/admin/agents?limit=500', []);

  const [approveRow, setApproveRow] = useState(null);
  const [terms, setTerms] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoRow, setInfoRow] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const items = data?.records ?? [];
  const levels = data?.levels ?? [];
  const parents = agents?.records ?? [];

  /**
   * Approval is the moment the account's position and terms are actually
   * decided, so it opens a form rather than a yes/no confirm. Defaults come
   * from the programme settings, and the upline defaults to whichever agent the
   * applicant's code resolved to.
   */
  const openApprove = (row) => {
    setApproveRow(row);
    setTerms({
      parentAgentId: row.parent_agent_id ?? '',
      level: settings?.default_level ?? 'agent',
      partnership: settings?.default_partnership ?? 25,
      commissionRate: settings?.default_commission_rate ?? 2,
      credit: settings?.default_opening_credit ?? 0,
    });
  };

  const submitApprove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(
        `/api/v1/admin/agents/applications/${approveRow.id}/approve`,
        { method: 'POST', body: JSON.stringify(terms) },
      );
      toast.success(`${approveRow.name} approved`);
      setApproveRow(null);
      reload();
    } catch (err) {
      // The API refuses a level that does not sit below the chosen parent, and
      // an opening credit the parent cannot cover.
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
        `/api/v1/admin/agents/applications/${rejectRow.id}/reject`,
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
        `/api/v1/admin/agents/applications/${infoRow.id}/request-info`,
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

  // The parent decides which levels are legal, because an account may only ever
  // sit strictly below its upline. A root — no parent — may sit at any level.
  const selectedParent = parents.find(
    (p) => String(p.id) === String(terms?.parentAgentId),
  );
  const parentIndex = selectedParent
    ? levels.findIndex((l) => l.value === selectedParent.level)
    : -1;
  // An unrecognised parent level offers nothing rather than everything — the
  // server's `can_create_below` returns an empty list in exactly that case, and
  // a dropdown that offers what approval will refuse is worse than an empty one.
  const allowedLevels = selectedParent
    ? (parentIndex < 0 ? [] : levels.slice(parentIndex + 1))
    : levels;

  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.name}</p>
          <p className="text-xs text-slate-500">
            {r.username} · {r.company}
          </p>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (r) => <span className="text-slate-400">{r.email}</span> },
    { key: 'market_region', label: 'Market', render: (r) => <span className="text-slate-300">{r.market_region || '—'}</span> },
    { key: 'expected_volume', label: 'Volume', render: (r) => <span className="text-slate-400">{r.expected_volume || '—'}</span> },
    {
      key: 'parent_name',
      label: 'Requested upline',
      render: (r) =>
        r.parent_name ? (
          <span className="text-slate-300">{r.parent_name}</span>
        ) : (
          // A code that resolved to nobody is kept verbatim so the reviewer can
          // tell a typo from a genuinely direct application.
          <div>
            <span className="text-slate-600">Direct</span>
            {r.requested_parent_code && (
              <p className="text-xs text-amber-400">
                typed “{r.requested_parent_code}” — no match
              </p>
            )}
          </div>
        ),
    },
    { key: 'applied_at', label: 'Applied', render: (r) => fmtDate(r.applied_at), filter: 'date' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'info_requested', label: 'Info Requested' },
        { value: 'rejected', label: 'Rejected' },
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
      <AdminShell title="Agent Applications" subtitle="Applications to the agent programme">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Agent Applications"
      subtitle={`${data?.summary?.pending ?? 0} pending review`}
    >
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['name', 'username', 'email', 'company', 'market_region']}
        searchPlaceholder="Search by name, username, email…"
        noun="application"
        pageSize={15}
        emptyIcon={Inbox}
        emptyMessage="No pending applications"
        emptyHint="Applications submitted from the agent landing page appear here, including the ones no upline claimed."
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
            This attaches the account to the tree and lets them sign in with the
            username and password they chose when applying.
          </p>

          {approveRow?.notes && (
            <div className="rounded-lg bg-slate-950 p-3 text-sm text-slate-300">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                Applicant&apos;s note
              </p>
              {approveRow.notes}
            </div>
          )}

          {terms && (
            <>
              <Field label="Upline">
                <Select
                  value={terms.parentAgentId}
                  onChange={(e) =>
                    // Changing the parent can invalidate the chosen level, so
                    // the level resets rather than being silently rejected on
                    // submit.
                    setTerms({ ...terms, parentAgentId: e.target.value, level: '' })
                  }
                >
                  <option value="">None — open at the top of the tree</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.level_label}) · {inr(p.available_credit)} free
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Level">
                  <Select
                    required
                    value={terms.level}
                    onChange={(e) => setTerms({ ...terms, level: e.target.value })}
                  >
                    <option value="">Choose a level…</option>
                    {allowedLevels.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Opening credit (₹)">
                  <Input
                    type="number"
                    min="0"
                    value={terms.credit}
                    onChange={(e) => setTerms({ ...terms, credit: e.target.value })}
                  />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-slate-500">
                {selectedParent
                  ? `Debited from ${selectedParent.name}, who has ${inr(selectedParent.available_credit)} free of open bets.`
                  : 'Injected by the platform — a root account has no upline to debit.'}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Partnership (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={terms.partnership}
                    onChange={(e) => setTerms({ ...terms, partnership: e.target.value })}
                  />
                </Field>
                <Field label="Commission (%)">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={terms.commissionRate}
                    onChange={(e) => setTerms({ ...terms, commissionRate: e.target.value })}
                  />
                </Field>
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
            {infoRow?.name} sees this when they check their application status.
          </p>
          <Field label="What do you need from them?">
            <Textarea
              rows={3}
              required
              placeholder="e.g. Tell us which markets you already operate in, and roughly how many players you expect to bring."
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject application"
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
            Rejecting the application from{' '}
            <span className="font-semibold text-white">{rejectRow?.name}</span>{' '}
            ({rejectRow?.company}).
          </p>
          {/* Required, and enforced server-side too: the applicant is shown
              this, and "rejected, no reason" generates a support ticket every
              time. */}
          <Field label="Rejection reason">
            <Textarea
              rows={3}
              required
              placeholder="e.g. We are not opening accounts in this market yet."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
