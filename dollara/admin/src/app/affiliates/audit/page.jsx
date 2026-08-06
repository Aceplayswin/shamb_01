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
import { mockFraudFlags, mockAuditLog } from '@/lib/affiliateMockData';
import { ShieldAlert, History, AlertTriangle, EyeOff } from 'lucide-react';

export default function FraudAuditPage() {
  const [flags, setFlags] = useState(mockFraudFlags);
  const [activeTab, setActiveTab] = useState('fraud');

  const handleDismiss = (id) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, status: 'dismissed' } : f));
    toast.success('Flag dismissed');
  };

  const handleSuspend = async (id, name) => {
    const ok = await confirmDialog({
      title: 'Suspend Affiliate',
      text: `Are you sure you want to suspend the affiliate account for ${name}?`,
      confirmText: 'Suspend',
      icon: 'warning'
    });
    if (ok) {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, status: 'suspended' } : f));
      toast.success('Affiliate suspended');
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
        <p className="text-xs text-slate-500">{r.affiliate_id}</p>
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
    { key: 'timestamp', label: 'Detected At', render: (r) => (
      <span className="text-slate-400 text-sm">{new Date(r.timestamp).toLocaleString()}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      r.status === 'open' && (
        <div className="flex justify-end gap-2">
          <Button variant="danger" size="sm" onClick={() => handleSuspend(r.id, r.affiliate_name)}>
            <ShieldAlert size={16} />
            Suspend
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleDismiss(r.id)}>
            <EyeOff size={16} />
            Dismiss
          </Button>
        </div>
      )
    )}
  ];

  const auditColumns = [
    { key: 'timestamp', label: 'Time', render: (r) => (
      <span className="text-slate-400 text-sm whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</span>
    )},
    { key: 'admin_user', label: 'Admin User', render: (r) => (
      <span className="font-medium text-emerald-400">@{r.admin_user}</span>
    )},
    { key: 'action', label: 'Action Taken', render: (r) => (
      <span className="text-slate-200">{r.action}</span>
    )},
    { key: 'target', label: 'Target', render: (r) => (
      <span className="text-amber-400 text-sm">{r.target}</span>
    )},
    { key: 'ip', label: 'Admin IP', render: (r) => (
      <span className="text-slate-500 font-mono text-xs">{r.ip}</span>
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
          {flags.filter(f => f.status === 'open').length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
              {flags.filter(f => f.status === 'open').length}
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
          Admin Audit Log
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {activeTab === 'fraud' ? (
          <DataTable
            columns={fraudColumns}
            rows={flags}
          />
        ) : (
          <DataTable
            columns={auditColumns}
            rows={mockAuditLog}
          />
        )}
      </div>

    </AdminShell>
  );
}
