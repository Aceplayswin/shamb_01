'use client';

/**
 * Blocked IP — reference screen `/blocked-ip`.
 *
 * The reference puts the submit form and the list on a single page, so this
 * one does too: the form writes, then the table below reloads.
 */

import { useState } from 'react';
import { Ban, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  StatusBadge,
  confirmDialog,
  toast,
  fmtDate,
} from '@/components/admin/AdminShell';
import { ResultTable, useBackofficeData, col } from '@/components/admin/Backoffice';

const EMPTY = { ip_address: '', status: 'block', comments: '' };

export default function BlockedIpPage() {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useBackofficeData(
    '/api/v1/admin/bo/blocked-ips',
    {},
    { page, pageSize: 25 },
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await adminApi(`/api/v1/admin/bo/blocked-ips/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: form.status, comments: form.comments }),
        });
        toast.success('Rule updated');
      } else {
        await adminApi('/api/v1/admin/bo/blocked-ips/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('IP rule saved');
      }
      reset();
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({
      ip_address: row.ip_address,
      status: row.status,
      comments: row.comments ?? '',
    });
  };

  const remove = async (row) => {
    const ok = await confirmDialog({
      title: 'Remove this rule?',
      text: `${row.ip_address} will no longer be ${row.status}ed.`,
      confirmText: 'Remove',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/bo/blocked-ips/${row.id}`, { method: 'DELETE' });
      toast.success('Rule removed');
      if (editingId === row.id) reset();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    col.text('ip_address', 'Ip Address'),
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status === 'block' ? 'blocked' : 'active'} />,
    },
    col.text('comments', 'Comments'),
    { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    { key: 'updated_at', label: 'Updated', render: (r) => fmtDate(r.updated_at) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => edit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Blocked IP"
      subtitle="Block or allow individual addresses, and review existing rules."
    >
      <div className="space-y-5">
        <Card className="p-5">
          <form onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Enter IP Address *">
                <Input
                  placeholder="Ex: 192.168.1.153"
                  value={form.ip_address}
                  onChange={set('ip_address')}
                  // An existing rule is keyed by its address, so editing one
                  // changes the decision, never the address itself.
                  disabled={!!editingId}
                  required
                />
              </Field>
              <Field label="Status *">
                <Select value={form.status} onChange={set('status')} required>
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                </Select>
              </Field>
              <Field label="Comments">
                <Textarea
                  rows={1}
                  placeholder="Why is this address being blocked?"
                  value={form.comments}
                  onChange={set('comments')}
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" icon={Ban} busy={busy}>
                {editingId ? 'Update rule' : 'Submit'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={reset}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </Card>

        <ResultTable
          title="Blocked IP List"
          columns={columns}
          rows={data?.rows}
          loading={loading}
          error={error}
          onRetry={reload}
          total={data?.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          emptyHint="Addresses you block will be listed here."
        />
      </div>
    </AdminShell>
  );
}
