'use client';

import { useMemo, useState } from 'react';
import { Image as ImageIcon, Plus, Pencil, Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
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

const emptyPoster = {
  title: '',
  image_url: '',
  link_url: '',
  sort_order: 0,
  status: 'active',
};

export default function AdminPromotionsPage() {
  const { data: posters, loading, reload } = useAdminData('/api/v1/admin/promotion-posters');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPoster);
  const [busy, setBusy] = useState(false);
  const [reordering, setReordering] = useState(null);

  const ordered = useMemo(
    () =>
      [...(posters ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.id ?? 0) - (b.id ?? 0),
      ),
    [posters],
  );

  const save = async (e) => {
    e.preventDefault();
    if (!form.image_url) {
      toast.error('A promotion image is required');
      return;
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/promotion-posters/create', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Promotion created');
      } else {
        await adminApi(`/api/v1/admin/promotion-posters/${editing}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Promotion updated');
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
    if (!window.confirm('Delete this promotion? This cannot be undone.')) return;
    try {
      await adminApi(`/api/v1/admin/promotion-posters/${id}`, { method: 'DELETE' });
      toast.success('Promotion deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];

    const updates = next
      .map((b, i) => ({ id: b.id, sort_order: i, prev: b.sort_order ?? 0 }))
      .filter((u) => u.sort_order !== u.prev);

    setReordering(next[target].id);
    try {
      await Promise.all(
        updates.map((u) =>
          adminApi(`/api/v1/admin/promotion-posters/${u.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ sort_order: u.sort_order }),
          }),
        ),
      );
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReordering(null);
    }
  };

  const columns = [
    {
      key: 'sort_order',
      label: 'Order',
      sortable: false,
      render: (r) => {
        const index = ordered.findIndex((b) => b.id === r.id);
        const isBusy = reordering !== null;
        return (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-800 text-xs font-bold text-slate-300">
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                aria-label="Move up"
                title="Move up"
                disabled={isBusy || index === 0}
                onClick={() => move(index, -1)}
                className="grid h-4 w-6 place-items-center rounded text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                title="Move down"
                disabled={isBusy || index === ordered.length - 1}
                onClick={() => move(index, 1)}
                className="grid h-4 w-6 place-items-center rounded text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'image_url',
      label: 'Poster',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-700 bg-slate-950">
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
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
      ],
    },
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
      title="Promotions"
      subtitle={`${posters?.length ?? 0} posters · shown on the web /promotions page · use ↑ ↓ to set the order`}
      actions={
        <Button
          icon={Plus}
          onClick={() => {
            setForm(emptyPoster);
            setEditing('new');
          }}
        >
          Add promotion
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={ordered}
        loading={loading}
        searchable
        searchKeys={['title', 'link_url']}
        searchPlaceholder="Search promotions…"
        noun="promotion"
        emptyIcon={ImageIcon}
        emptyMessage="No promotions yet. Add a poster image to show it on /promotions."
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add promotion' : 'Edit promotion'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button form="promo-form" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="promo-form" onSubmit={save} className="grid gap-4">
          <ImageUploadField
            id="promo-image"
            label="Promotion poster"
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            placeholder="https://… (offer poster image)"
          />
          <Field label="Title (internal label, optional)">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Weekend cashback"
            />
          </Field>
          <Field label="Link URL (optional — leave blank for a non-clickable poster)">
            <Input
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="/register or https://…"
            />
          </Field>
          <Field label="Visibility">
            <Toggle
              checked={form.status === 'active'}
              onChange={(v) => setForm({ ...form, status: v ? 'active' : 'draft' })}
              label={form.status === 'active' ? 'Active (visible on site)' : 'Draft (hidden)'}
            />
          </Field>
          <p className="text-xs text-slate-500">
            Order is set from the list with the ↑ ↓ arrows once the promotion is saved.
          </p>
        </form>
      </Modal>
    </AdminShell>
  );
}
