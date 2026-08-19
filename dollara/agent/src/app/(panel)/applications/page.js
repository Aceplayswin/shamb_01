'use client';

import { useCallback, useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import Card from '../_components/Card';
import ApproveModal from '../_components/ApproveModal';
import { DataState } from '../../../components/ui/DataState';
import { Pagination } from '../../../components/ui/Pagination';
import { useAgent } from '../../../context/AgentContext';
import { useAgentData } from '../../../hooks/useAgentData';
import { fmtDateTime } from '../../../lib/format';
import { confirmDialog, toast } from '../../../lib/toast';
import { agentWrite } from '../../../services/agentApi';

const PER_PAGE = 25;

const COLUMNS = [
  'Applied',
  'Username',
  'Name',
  'Contact',
  'Operation',
  'Status',
  'Actions',
];

const STATUS_TONE = {
  pending: 'bg-amber-400/15 text-amber-300',
  info_requested: 'bg-amber-400/15 text-amber-300',
  rejected: 'bg-down/15 text-down',
};

/**
 * Applications addressed to this agent.
 *
 * The queue is what makes the public apply flow more than a form that posts
 * into a void — an application names an upline by code, and lands here for
 * them. Direct applications (no code given) land with the top of the tree.
 */
export default function ApplicationsPage() {
  const { me, refresh } = useAgent();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(0);
  const [approving, setApproving] = useState(null);

  const query = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
  });
  if (status) query.set('status', status);

  const { data, loading, error, reload } = useAgentData(
    `/api/v1/agent/applications?${query.toString()}`,
    [query.toString()],
  );

  const decide = useCallback(
    async (application, decision) => {
      const rejecting = decision === 'rejected';
      const ok = await confirmDialog({
        title: rejecting
          ? `Reject ${application.username}?`
          : `Ask ${application.username} for more information?`,
        text: rejecting
          ? 'They will not be able to sign in, and will see this decision when they check their status.'
          : 'The application stays open and they will see that more detail is needed.',
        confirmText: rejecting ? 'Reject' : 'Request info',
        danger: rejecting,
      });
      if (!ok) return;
      try {
        await agentWrite(`/api/v1/agent/applications/${application.id}/decide`, {
          decision,
        });
        toast.success(rejecting ? 'Application rejected' : 'More information requested');
        reload();
      } catch (e) {
        toast.error(e.message || 'Could not update the application');
      }
    },
    [reload],
  );

  const rows = data?.rows ?? [];
  const levels = data?.canApprove ?? me?.canCreate ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <Card title="Applications">
        <div className="rounded bg-panel-sunken p-5">
          <div className="max-w-xs">
            <label htmlFor="application-status" className="field-label">
              Status
            </label>
            <select
              id="application-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="field"
            >
              <option value="pending">Pending review</option>
              <option value="info_requested">Information requested</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Applications reach you when someone enters your agent code{' '}
            <span className="font-mono text-ink-muted">{me?.code}</span> on the
            public apply form. Share{' '}
            <span className="font-mono text-ink-muted">/apply?ref={me?.code}</span>{' '}
            to prefill it for them.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-ink">Review Queue</h2>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <DataState
                loading={loading}
                error={error}
                empty={!rows.length}
                onRetry={reload}
                colSpan={COLUMNS.length}
                emptyLabel="No applications waiting"
                skeleton={
                  <tr>
                    <td colSpan={COLUMNS.length} className="!p-0">
                      <div className="h-24 animate-pulse bg-panel-head/50" />
                    </td>
                  </tr>
                }
              >
                {rows.map((application) => (
                  <tr key={application.id}>
                    <td className="whitespace-nowrap">
                      {fmtDateTime(application.appliedAt)}
                    </td>
                    <td>
                      <span className="font-medium text-ink">
                        {application.username}
                      </span>
                      <span className="ml-1 font-mono text-xs text-ink-faint">
                        {application.code}
                      </span>
                    </td>
                    <td>
                      {application.name}
                      {application.companyName && (
                        <span className="block text-xs text-ink-faint">
                          {application.companyName}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="block text-xs">{application.email}</span>
                      {application.phone && (
                        <span className="block text-xs text-ink-faint">
                          {application.phone}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="block text-xs">
                        {application.marketRegion ?? '—'}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {application.expectedVolume ?? '—'} players ·{' '}
                        {application.experience ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          STATUS_TONE[application.status] ?? 'bg-panel-head text-ink-muted'
                        }`}
                      >
                        {application.statusLabel}
                      </span>
                    </td>
                    <td>
                      {application.status === 'rejected' ? (
                        <span className="text-xs text-ink-faint">Decided</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setApproving(application)}
                            disabled={!levels.length}
                            title={
                              levels.length
                                ? undefined
                                : 'Your level cannot open accounts below it'
                            }
                            className="inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-up transition hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(application, 'info_requested')}
                            className="inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-ink-muted transition hover:bg-panel-hover hover:text-ink"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Need info
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(application, 'rejected')}
                            className="inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-down transition hover:bg-panel-hover"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </DataState>
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={data?.total ?? 0}
          perPage={PER_PAGE}
          onPage={setPage}
          noun="application"
        />
      </Card>

      {approving && (
        <ApproveModal
          application={approving}
          levels={levels}
          myBalance={me?.availableCredit}
          onClose={() => setApproving(null)}
          onDone={() => {
            reload();
            refresh();
          }}
        />
      )}
    </div>
  );
}
