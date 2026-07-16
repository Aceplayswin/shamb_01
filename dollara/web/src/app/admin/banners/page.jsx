'use client';

import { useState } from 'react';
import { Image as ImageIcon, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Toggle,
  ImageUploadField,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const emptyBanner = {
  title: '',
  image_url: '',
  link_url: '',
  sort_order: 0,
  status: 'active',
};

export default function AdminBannersPage() {
  const { data: banners, loading, reload } = useAdminData('/api/v1/admin/banners');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBanner);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.image_url) {
      toast.error('A banner image is required');
      return;
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/banners/create', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Banner created');
      } else {
        await adminApi(`/api/v1/admin/banners/${editing}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Banner updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this banner? This cannot be undone.')) return;
    try {
      await adminApi(`/api/v1/admin/banners/${id}`, { method: 'DELETE' });
      toast.success('Banner deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'image_url',
      label: 'Banner',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-20 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-700 bg-slate-950">
            {r.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4 text-slate-600" />
            )}
          </span>
          <p className="font-medium text-white">{r.title || <span className="text-slate-500">Untitled</span>}</p>
        </div>
      ),
    },
    {
      key: 'link_url',
      label: 'Links to',
      render: (r) =>
        r.link_url ? (
          <a
            href={r.link_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-[220px] items-center gap-1 truncate text-xs text-indigo-300 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{r.link_url}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-500">Not clickable</span>
        ),
    },
    { key: 'sort_order', label: 'Order', render: (r) => <span className="text-slate-300">{r.sort_order}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setForm({
                title: r.title || '',
                image_url: r.image_url || '',
                link_url: r.link_url || '',
                sort_order: r.sort_order ?? 0,
                status: r.status,
              });
              setEditing(r.id);
            }}
          >
            Edit
          </Button>
          <Button variant="secondary" size="sm" icon={Trash2} onClick={() => remove(r.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Home Banners"
      subtitle={`${banners?.length ?? 0} banners · shown in the home hero carousel`}
      actions={<Button icon={Plus} onClick={() => { setForm(emptyBanner); setEditing('new'); }}>Add banner</Button>}
    >
      <DataTable
        columns={columns}
        rows={banners}
        loading={loading}
        searchable
        searchKeys={['title', 'link_url']}
        searchPlaceholder="Search banners…"
        emptyIcon={ImageIcon}
        emptyMessage="No banners yet. Add one to show it in the home carousel."
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add banner' : 'Edit banner'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="banner-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={save} className="grid gap-4">
          <ImageUploadField
            id="banner-image"
            label="Banner image"
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            placeholder="https://… (wide image, e.g. 1600×400)"
          />
          <Field label="Title (internal label, optional)">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Welcome offer" />
          </Field>
          <Field label="Link URL (optional — leave blank for a non-clickable banner)">
            <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/register or https://…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sort order (lower shows first)">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>
            <Field label="Visibility">
              <Toggle
                checked={form.status === 'active'}
                onChange={(v) => setForm({ ...form, status: v ? 'active' : 'draft' })}
                label={form.status === 'active' ? 'Active (visible on site)' : 'Draft (hidden)'}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
