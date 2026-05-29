'use client';

import { useState } from 'react';
import { PhoneCall, FileText } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Modal,
  Button,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminAiCallsPage() {
  const { data: calls, loading } = useAdminData('/api/v1/admin/ai-calls?limit=200');
  const [transcript, setTranscript] = useState(null);

  const columns = [
    { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
    { key: 'username', label: 'User', render: (r) => <span className="font-medium text-white">{r.username}</span> },
    { key: 'voice_executive_id', label: 'Executive', render: (r) => r.voice_executive_id || '—' },
    { key: 'duration_seconds', label: 'Duration', render: (r) => (r.duration_seconds ? `${r.duration_seconds}s` : '—') },
    {
      key: 'deposit_intent',
      label: 'Deposit intent',
      render: (r) =>
        r.deposit_intent ? (
          <span className="font-semibold text-emerald-400">{r.deposit_amount ? inr(r.deposit_amount) : 'Yes'}</span>
        ) : (
          <span className="text-slate-500">No</span>
        ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.transcript ? (
          <Button variant="ghost" size="sm" icon={FileText} onClick={() => setTranscript(r)}>
            Transcript
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminShell title="AI Call Logs" subtitle="Voice executive interactions">
      <DataTable
        columns={columns}
        rows={calls}
        loading={loading}
        searchable
        searchKeys={['username', 'voice_executive_id']}
        searchPlaceholder="Search calls…"
        pageSize={20}
        emptyIcon={PhoneCall}
        emptyMessage="No AI calls logged"
      />

      <Modal open={!!transcript} onClose={() => setTranscript(null)} title="Call transcript">
        <p className="mb-3 text-xs text-slate-500">
          {transcript?.username} · {fmtDate(transcript?.created_at)}
        </p>
        <p className="whitespace-pre-wrap rounded-lg bg-surface-950/50 p-4 text-sm leading-relaxed text-slate-300">
          {transcript?.transcript || 'No transcript available.'}
        </p>
      </Modal>
    </AdminShell>
  );
}
