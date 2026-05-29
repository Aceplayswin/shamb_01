'use client';

import { useState } from 'react';
import { Building2, Plus, Pencil } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Toggle,
  toast,
  useAdminData,
  fmtDate,
} from '@/components/admin/AdminShell';

const emptyProvider = { name: '', slug: '', logo_url: '', is_active: true };

export default function AdminProvidersPage() {
  const { data: providers, loading, reload } = useAdminData('/api/v1/admin/providers');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProvider);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/providers/create', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Provider created');
      } else {
        await adminApi(`/api/v1/admin/providers/${editing}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Provider updated');
      }
      setEditing(null);
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
      label: 'Provider',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-800 text-xs font-bold text-brand-400">
            {r.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-white">{r.name}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', render: (r) => <span className="text-slate-400">{r.slug}</span> },
    { key: 'is_active', label: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
    { key: 'created_at', label: 'Added', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setForm({ name: r.name, slug: r.slug, logo_url: r.logo_url || '', is_active: r.is_active });
              setEditing(r.id);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Game Providers"
      subtitle={`${providers?.length ?? 0} providers`}
      actions={
        <Button icon={Plus} onClick={() => { setForm(emptyProvider); setEditing('new'); }}>
          Add provider
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={providers}
        loading={loading}
        searchable
        searchKeys={['name', 'slug']}
        searchPlaceholder="Search providers…"
        emptyIcon={Building2}
        emptyMessage="No providers yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add provider' : 'Edit provider'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="provider-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form id="provider-form" onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </Field>
          <Field label="Logo URL">
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
        </form>
      </Modal>
    </AdminShell>
  );
}
