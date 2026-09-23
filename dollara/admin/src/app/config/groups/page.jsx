'use client';

/**
 * User Groups — reference screens `/new-group` and `/usersgroup` merged.
 *
 * The reference renders permissions as a checkbox matrix of module × action;
 * that matrix is kept, sent as the complete desired permission set on save.
 */

import { useState } from 'react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Toggle,
  Modal,
  StatusBadge,
  confirmDialog,
  toast,
  fmtDate,
} from '@/components/admin/AdminShell';
import {
  FilterPanel,
  ResultTable,
  useBackofficeData,
  col,
} from '@/components/admin/Backoffice';

const MODULES = [
  'dashboard', 'users', 'bonus', 'games', 'transactions',
  'mailing', 'reports', 'configurations', 'cashier', 'support', 'sports',
];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

const EMPTY = { name: '', description: '', is_active: true, permissions: [] };

export default function StaffGroupsPage() {
  const [draft, setDraft] = useState({ name: '' });
  const [applied, setApplied] = useState({ name: '' });
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useBackofficeData(
    '/api/v1/admin/bo/staff-groups',
    applied,
    { page, pageSize: 25 },
  );

  const has = (module, permission) =>
    form.permissions.some((p) => p.module === module && p.permission === permission);

  const toggle = (module, permission) =>
    setForm((f) => ({
      ...f,
      permissions: has(module, permission)
        ? f.permissions.filter(
            (p) => !(p.module === module && p.permission === permission),
          )
        : [...f.permissions, { module, permission }],
    }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = async (row) => {
    try {
      const full = await adminApi(`/api/v1/admin/bo/staff-groups/${row.id}`);
      setEditing(row);
      setForm({ ...EMPTY, ...full, permissions: full.permissions ?? [] });
      setOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await adminApi(`/api/v1/admin/bo/staff-groups/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Group saved');
      } else {
        await adminApi('/api/v1/admin/bo/staff-groups/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Group created');
      }
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirmDialog({
      title: 'Delete this group?',
      text: `"${row.name}" will be removed.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/bo/staff-groups/${row.id}`, { method: 'DELETE' });
      toast.success('Group deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    col.number('id', 'ID'),
    col.text('name', 'Group'),
    col.text('description', 'Description'),
    col.number('members', 'Members'),
    col.number('permissions', 'Permissions'),
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
    },
    { key: 'created_at', label: 'Created Date', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="User Groups"
      subtitle="Permission groups for backoffice accounts."
      actions={
        <Button icon={PlusCircle} onClick={openCreate}>
          New Group
        </Button>
      }
    >
      <div className="space-y-5">
        <FilterPanel
          fields={[{ name: 'name', label: 'Group' }]}
          values={draft}
          onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))}
          onSearch={() => {
            setPage(0);
            setApplied(draft);
          }}
          onClear={() => {
            setDraft({ name: '' });
            setApplied({ name: '' });
            setPage(0);
          }}
          busy={loading}
        />

        <ResultTable
          title="User Groups"
          columns={columns}
          rows={data?.rows}
          loading={loading}
          error={error}
          onRetry={reload}
          total={data?.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit group' : 'New group'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="group-form" type="submit" busy={busy}>
              {editing ? 'Save changes' : 'Create group'}
            </Button>
          </>
        }
      >
        <form id="group-form" onSubmit={submit} className="space-y-4">
          <Field label="Group name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Permissions
            </p>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Module
                    </th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a}
                        className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-4 py-2 capitalize text-slate-200">{m}</td>
                      {ACTIONS.map((a) => (
                        <td key={a} className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500/40"
                            checked={has(m, a)}
                            onChange={() => toggle(m, a)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Toggle
            checked={!!form.is_active}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            label="Active"
          />
        </form>
      </Modal>
    </AdminShell>
  );
}
