'use client';

import { ShieldCheck } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  useAdminData,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminStaffPage() {
  const { data: staff, loading } = useAdminData('/api/v1/admin/staff');

  const columns = [
    {
      key: 'username',
      label: 'Administrator',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/15 text-xs font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
            {r.username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-medium text-white">{r.username}</p>
            <p className="text-xs text-slate-500">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (r) => <span className="capitalize text-slate-300">{r.role.replace(/_/g, ' ')}</span>,
    },
    { key: 'is_active', label: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
    { key: 'last_login_at', label: 'Last login', render: (r) => fmtDate(r.last_login_at) },
    { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
  ];

  return (
    <AdminShell title="Admin Staff" subtitle="Platform administrators & roles">
      <DataTable
        columns={columns}
        rows={staff}
        loading={loading}
        searchable
        searchKeys={['username', 'email', 'role']}
        searchPlaceholder="Search staff…"
        emptyIcon={ShieldCheck}
        emptyMessage="No staff accounts"
        emptyHint="Seed creates the default superadmin."
      />
    </AdminShell>
  );
}
