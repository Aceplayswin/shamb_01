'use client';

import Link from 'next/link';
import {
  AdminShell,
  DataTable,
  ErrorState,
  fmtDate,
  useAdminData,
} from '@/components/admin/AdminShell';
import { ScrollText } from 'lucide-react';

/**
 * Everything anyone has done to an agent account.
 *
 * One trail, not two: an upline locking a client's betting and a staff member
 * moving that same client to another branch are the same kind of fact about the
 * same account, and splitting them by who acted would mean reading two screens
 * to reconstruct one story. The actor column is what tells them apart —
 * console actions are prefixed `admin.`.
 */
export default function AgentAuditPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/agents/audit?limit=300',
    [],
  );

  const rows = data?.records ?? [];

  const columns = [
    { key: 'created_at', label: 'Time', render: (r) => (
      <span className="whitespace-nowrap text-sm text-slate-400">{fmtDate(r.created_at)}</span>
    )},
    { key: 'actor_label', label: 'Actor', render: (r) => (
      <div>
        <span className="font-medium text-emerald-400">{r.actor_label || 'system'}</span>
        <p className="text-xs text-slate-500">
          {r.action?.startsWith('admin.') ? 'Admin console' : 'Agent panel'}
        </p>
      </div>
    )},
    { key: 'action', label: 'Action', render: (r) => (
      <span className="text-slate-200">{r.action}</span>
    )},
    { key: 'agent_name', label: 'Account', render: (r) => (
      // A NULL agent_id is a programme-wide action — a settings change, or the
      // deletion of the very account it concerns. There is no row to link to.
      r.agent_id ? (
        <Link href={`/agents/${r.agent_id}`} className="text-blue-400 hover:underline">
          {r.agent_name || `#${r.agent_id}`}
        </Link>
      ) : (
        <span className="text-slate-600">Programme-wide</span>
      )
    )},
    { key: 'target_type', label: 'Target', render: (r) => (
      <span className="text-sm text-amber-400">
        {r.target_type ? `${r.target_type}:${r.target_id}` : '—'}
      </span>
    )},
    { key: 'ip', label: 'IP', render: (r) => (
      <span className="font-mono text-xs text-slate-500">{r.ip || '—'}</span>
    )},
  ];

  if (error) {
    return (
      <AdminShell title="Agent Audit Log">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Agent Audit Log"
      subtitle={`${data?.total ?? 0} recorded actions`}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Audit Log</h2>
        <p className="text-slate-400">
          Approvals, terms changes, credit movements, locks and password resets —
          from the console and from the agent panel alike.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        searchable
        searchKeys={['action', 'actor_label', 'agent_name']}
        searchPlaceholder="Search the audit trail…"
        noun="entry"
        pageSize={25}
        emptyIcon={ScrollText}
        emptyMessage="No activity recorded yet"
        emptyHint="Every state change to an agent account writes a row here."
      />
    </AdminShell>
  );
}
