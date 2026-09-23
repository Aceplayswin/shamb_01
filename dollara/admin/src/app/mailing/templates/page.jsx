'use client';

/**
 * Mail Templates — reference screens `/newtemplate` and `/templates` merged
 * into one page: the list, with create and edit in a modal.
 */

import { useState } from 'react';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Field,
  Input,
  Select,
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

const FIELDS = [
  { name: 'name', label: 'Template name' },
  {
    name: 'channel',
    label: 'Channel',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'both', label: 'Both' },
    ],
  },
];

const BLANK = { name: '', channel: '' };
const EMPTY = {
  name: '',
  subject: '',
  channel: 'email',
  language: 'en',
  event_key: '',
  body: '',
  is_active: true,
};

export default function TemplatesPage() {
  const [draft, setDraft] = useState(BLANK);
  const [applied, setApplied] = useState(BLANK);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useBackofficeData(
    '/api/v1/admin/bo/templates',
    applied,
    { page, pageSize: 25 },
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = async (row) => {
    try {
      // The list omits the body; fetch the full template before editing.
      const full = await adminApi(`/api/v1/admin/bo/templates/${row.id}`);
      setEditing(row);
      setForm({ ...EMPTY, ...full });
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
        await adminApi(`/api/v1/admin/bo/templates/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Template saved');
      } else {
        await adminApi('/api/v1/admin/bo/templates/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Template created');
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
      title: 'Delete this template?',
      text: `"${row.name}" will be removed.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/bo/templates/${row.id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    col.number('id', 'ID'),
    col.text('name', 'Name'),
    col.text('subject', 'Subject'),
    col.text('channel', 'Channel'),
    col.text('language', 'Language'),
    col.text('event_key', 'Event'),
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
    },
    { key: 'updated_at', label: 'Updated', render: (r) => fmtDate(r.updated_at) },
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
      title="Templates"
      subtitle="Email and SMS templates fired by platform events."
      actions={
        <Button icon={PlusCircle} onClick={openCreate}>
          New Template
        </Button>
      }
    >
      <div className="space-y-5">
        <FilterPanel
          fields={FIELDS}
          values={draft}
          onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))}
          onSearch={() => {
            setPage(0);
            setApplied(draft);
          }}
          onClear={() => {
            setDraft(BLANK);
            setApplied(BLANK);
            setPage(0);
          }}
          busy={loading}
        />

        <ResultTable
          title="Templates"
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
        title={editing ? 'Edit template' : 'New template'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="template-form" type="submit" busy={busy}>
              {editing ? 'Save changes' : 'Create template'}
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Channel">
              <Select value={form.channel} onChange={set('channel')}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Both</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject">
            <Input
              value={form.subject}
              onChange={set('subject')}
              placeholder="Required for email templates"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <Input value={form.language} onChange={set('language')} />
            </Field>
            <Field label="Event key">
              <Input
                value={form.event_key}
                onChange={set('event_key')}
                placeholder="e.g. signup"
              />
            </Field>
          </div>
          <Field label="Body">
            <Textarea rows={8} value={form.body} onChange={set('body')} />
          </Field>
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
