'use client';

// Manage Admin — create, edit, suspend and remove console accounts.
// Writes are super-admin only; the API enforces that and also refuses any edit
// that would leave the product with no active super admin.

import { useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { adminApi, getAdminRole } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  Select,
  StatusBadge,
  confirmDialog,
  toast,
  useAdminData,
  fmtDate,
} from '@/components/admin/AdminShell';

const BLANK = {
  username: '',
  full_name: '',
  email: '',
  role: 'admin',
  password: '',
  account_status: 'active',
};

export default function AdminStaffPage() {
  const { data: staff, loading, reload } = useAdminData('/api/v1/admin/staff');
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = getAdminRole() === 'super_admin';

  const openCreate = () => {
    setForm(BLANK);
    setEditing('new');
  };

  const openEdit = (row) => {
    setForm({
      username: row.username ?? '',
      full_name: row.full_name ?? '',
      email: row.email ?? '',
      role: row.role,
      password: '',
      account_status: row.account_status,
    });
    setEditing(row);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/staff/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Admin created');
      } else {
        // Username is the login identity — changing it is not offered here.
        const { username, ...changes } = form;
        if (!changes.password) delete changes.password;
        await adminApi(`/api/v1/admin/staff/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(changes),
        });
        toast.success('Admin updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirmDialog({
      title: `Remove ${row.username}?`,
      text: 'This admin will lose access to the console immediately.',
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/staff/${row.id}`, { method: 'DELETE' });
      toast.success('Admin removed');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

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
            <p className="text-xs text-slate-500">{r.email || r.full_name || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (r) => (
        <span className="capitalize text-slate-300">{r.role.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => <StatusBadge status={r.account_status} />,
    },
    { key: 'last_login_at', label: 'Last login', render: (r) => fmtDate(r.last_login_at) },
    { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        isSuperAdmin ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(r)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => remove(r)}>
              Remove
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <AdminShell
      title="Manage Admin"
      subtitle="Console accounts, roles and access"
      actions={
        isSuperAdmin ? (
          <Button icon={Plus} onClick={openCreate}>
            New admin
          </Button>
        ) : null
      }
    >
      {!isSuperAdmin && (
        <p className="mb-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          You are signed in as an admin. Only a super admin can create or modify
          console accounts.
        </p>
      )}

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

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New admin' : `Edit ${editing?.username ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          {editing === 'new' && (
            <Field label="Username">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ops.manager"
                autoComplete="off"
              />
            </Field>
          )}
          <Field label="Full name">
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Role">
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </Field>
          {editing !== 'new' && (
            <Field label="Status">
              <Select
                value={form.account_status}
                onChange={(e) => setForm({ ...form, account_status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </Field>
          )}
          <Field
            label={editing === 'new' ? 'Password' : 'New password (leave blank to keep)'}
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="password"
                className="pl-9"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
