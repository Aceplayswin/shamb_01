'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  toast,
  confirmDialog
} from '@/components/admin/AdminShell';
import { ErrorState, fmtDate, inr, useAdminData } from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';
import { ShieldAlert, History, AlertTriangle, EyeOff, PlayCircle } from 'lucide-react';

export default function FraudAuditPage() {
  const [activeTab, setActiveTab] = useState('fraud');

  const fraudQuery = useAdminData('/api/v1/admin/affiliates/fraud-flags?limit=200', []);
  const auditQuery = useAdminData('/api/v1/admin/affiliates/audit?limit=200', []);
  const runsQuery = useAdminData('/api/v1/admin/affiliates/commissions/runs?limit=50', []);

  const flags = fraudQuery.data?.records ?? [];
  const auditRows = auditQuery.data?.records ?? [];
  const runs = runsQuery.data?.records ?? [];
  const openCount = fraudQuery.data?.summary?.open ?? 0;

  const resolveFlag = async (row, status) => {
    if (status === 'actioned') {
      const ok = await confirmDialog({
        title: 'Suspend this affiliate?',
        text: `${row.affiliate_name} loses access and their links stop attributing. `
          + 'The flag is recorded as actioned.',
        confirmText: 'Suspend',
        danger: true,
      });
      if (!ok) return;
    }

    try {
      // Actioning a flag suspends the account as well; dismissing only clears
      // the flag, which is what unblocks the commission auto-approval.
      if (status === 'actioned') {
        await adminApi(`/api/v1/admin/affiliates/${row.affiliate_id}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'suspended' }),
        });
      }
      await adminApi(`/api/v1/admin/affiliates/fraud-flags/${row.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'actioned' ? 'Affiliate suspended' : 'Flag dismissed');
      fraudQuery.reload();
      auditQuery.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const fraudColumns = [
    { key: 'affiliate_name', label: 'Affiliate', render: (r) => (
      <div>
        <Link href={`/affiliates/${r.affiliate_id}`} className="font-medium text-blue-400 hover:underline">
          {r.affiliate_name}
        </Link>
        <p className="text-xs text-slate-500">{r.affiliate_code}</p>
      </div>
    )},
    { key: 'reason', label: 'Flag Reason', render: (r) => (
      <span className="text-slate-300">{r.reason}</span>
    )},
    { key: 'risk_level', label: 'Risk Level', render: (r) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded border uppercase tracking-wider ${getRiskColor(r.risk_level)}`}>
        {r.risk_level}
      </span>
    )},
    { key: 'created_at', label: 'Detected At', render: (r) => (
      <span className="text-sm text-slate-400">{fmtDate(r.created_at)}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      r.status === 'open' && (
        <div className="flex justify-end gap-2">
          <Button variant="danger" size="sm" onClick={() => resolveFlag(r, 'actioned')}>
            <ShieldAlert size={16} />
            Suspend
          </Button>
          <Button variant="secondary" size="sm" onClick={() => resolveFlag(r, 'dismissed')}>
            <EyeOff size={16} />
            Dismiss
          </Button>
        </div>
      )
    )}
  ];

  const auditColumns = [
    { key: 'created_at', label: 'Time', render: (r) => (
      <span className="whitespace-nowrap text-sm text-slate-400">{fmtDate(r.created_at)}</span>
    )},
    { key: 'actor_label', label: 'Actor', render: (r) => (
      <div>
        <span className="font-medium text-emerald-400">
          {r.actor_label || r.actor_type}
        </span>
        <p className="text-xs capitalize text-slate-500">{r.actor_type}</p>
      </div>
    )},
    { key: 'action', label: 'Action Taken', render: (r) => (
      <span className="text-slate-200">{r.action}</span>
    )},
    { key: 'target', label: 'Target', render: (r) => (
      <span className="text-sm text-amber-400">
        {r.target || r.affiliate_name || '—'}
      </span>
    )},
    { key: 'ip', label: 'IP', render: (r) => (
      <span className="font-mono text-xs text-slate-500">{r.ip || '—'}</span>
    )},
  ];

  // Third tab: what the commission engine has actually done. Without it, a
  // "Run now" click reports a toast and then leaves no trace anyone can review.
  const runColumns = [
    { key: 'started_at', label: 'Started', render: (r) => (
      <span className="whitespace-nowrap text-sm text-slate-400">{fmtDate(r.started_at)}</span>
    )},
    { key: 'period_start', label: 'Period', render: (r) => (
      <span className="text-slate-300">
        {r.period_start === r.period_end
          ? r.period_start
          : `${r.period_start} → ${r.period_end}`}
      </span>
    )},
    { key: 'trigger_source', label: 'Triggered by', render: (r) => (
      <span className="capitalize text-slate-400">{r.triggered_by_label}</span>
    )},
    { key: 'entries_written', label: 'Written', render: (r) => (
      <span className="font-semibold text-white">{r.entries_written}</span>
    )},
    { key: 'entries_skipped', label: 'Skipped', render: (r) => (
      <span className="text-slate-400" title="Already approved or paid — never rewritten">
        {r.entries_skipped}
      </span>
    )},
    { key: 'entries_approved', label: 'Auto-approved', render: (r) => (
      <span className="text-slate-400">{r.entries_approved}</span>
    )},
    { key: 'total_amount', label: 'Total', render: (r) => (
      <span className="font-semibold text-emerald-400">{inr(r.total_amount)}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <div>
        <StatusBadge status={r.status === 'completed' ? 'completed' : r.status} />
        {r.error && <p className="mt-1 max-w-xs text-xs text-rose-400">{r.error}</p>}
      </div>
    )},
  ];

  return (
    <AdminShell title="Fraud & Audit">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Fraud & Audit Center</h2>
        <p className="text-slate-400">Review suspicious affiliate activity and monitor admin actions.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('fraud')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'fraud'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <AlertTriangle size={16} />
          Fraud Alerts
          {openCount > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {openCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <History size={16} />
          Audit Log
        </button>
        <button
          onClick={() => setActiveTab('runs')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'runs'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <PlayCircle size={16} />
          Commission Runs
        </button>
      </div>

      {activeTab === 'fraud' &&
        (fraudQuery.error ? (
          <ErrorState message={fraudQuery.error} onRetry={fraudQuery.reload} />
        ) : (
          <DataTable
            columns={fraudColumns}
            rows={flags}
            loading={fraudQuery.loading}
            searchable
            searchKeys={['affiliate_name', 'reason', 'rule_key']}
            searchPlaceholder="Search flags…"
            noun="flag"
            pageSize={20}
            emptyIcon={AlertTriangle}
            emptyMessage="No fraud flags"
            emptyHint="Self-referrals, IP velocity spikes and disposable emails land here."
          />
        ))}

      {activeTab === 'audit' &&
        (auditQuery.error ? (
          <ErrorState message={auditQuery.error} onRetry={auditQuery.reload} />
        ) : (
          <DataTable
            columns={auditColumns}
            rows={auditRows}
            loading={auditQuery.loading}
            searchable
            searchKeys={['action', 'actor_label', 'target', 'affiliate_name']}
            searchPlaceholder="Search the audit trail…"
            noun="entry"
            pageSize={25}
            emptyIcon={History}
            emptyMessage="No activity recorded yet"
          />
        ))}

      {activeTab === 'runs' &&
        (runsQuery.error ? (
          <ErrorState message={runsQuery.error} onRetry={runsQuery.reload} />
        ) : (
          <DataTable
            columns={runColumns}
            rows={runs}
            loading={runsQuery.loading}
            noun="run"
            pageSize={20}
            emptyIcon={PlayCircle}
            emptyMessage="No commission runs yet"
            emptyHint="Run the nightly command, or use “Run commissions now” on the affiliate list."
          />
        ))}

    </AdminShell>
  );
}
