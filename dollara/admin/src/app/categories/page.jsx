'use client';

import { useState } from 'react';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
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
  fmtDate,
} from '@/components/admin/AdminShell';

const emptyCategory = {
  name: '',
  slug: '',
  icon_url: '',
  // These two drive real money logic, not just display: sports categories are
  // reported on the sports side of every agent commission report, and
  // delayed-settlement ones keep their rounds Pending until a result callback
  // lands instead of reading as an instant loss.
  is_sports: false,
  is_delayed_settlement: false,
  is_active: true,
  sort_order: 0,
};

// A slug is the contract with the player-facing site (URLs, theme sections) and
// with reports, so it is derived from the name once on create and then only
// changed deliberately.
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

function categoryToForm(r) {
  return {
    name: r.name,
    slug: r.slug,
    icon_url: r.icon_url || '',
    is_sports: !!r.is_sports,
    is_delayed_settlement: !!r.is_delayed_settlement,
    is_active: !!r.is_active,
    sort_order: r.sort_order ?? 0,
  };
}

export default function AdminCategoriesPage() {
  const { data: categories, loading, reload } = useAdminData('/api/v1/admin/categories');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setForm(emptyCategory);
    setEditing('new');
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      slug: slugify(form.slug || form.name),
      icon_url: form.icon_url?.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/categories/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Category created');
      } else {
        await adminApi(`/api/v1/admin/categories/${editing}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Category updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      await adminApi(`/api/v1/admin/categories/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      toast.success(
        c.is_active
          ? 'Category disabled — its games are now hidden from players'
          : 'Category enabled',
      );
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // The API refuses to delete a category that still has games, so the only
  // thing to confirm here is the intent.
  const remove = async (c) => {
    if (!window.confirm(`Delete the "${c.name}" category?`)) return;
    try {
      await adminApi(`/api/v1/admin/categories/${c.id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Category',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            {r.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.icon_url} alt="" className="h-full w-full object-cover" />
            ) : (
              r.name.slice(0, 2).toUpperCase()
            )}
          </span>
          <span className="font-medium text-white">{r.name}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', render: (r) => <span className="text-slate-400">{r.slug}</span> },
    { key: 'game_count', label: 'Games', render: (r) => r.game_count ?? '—' },
    {
      key: 'behaviour',
      label: 'Behaviour',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.is_sports && (
            <span className="whitespace-nowrap rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-400 ring-1 ring-sky-500/30">
              Sports
            </span>
          )}
          {r.is_delayed_settlement && (
            <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              Settles later
            </span>
          )}
          {!r.is_sports && !r.is_delayed_settlement && (
            <span className="text-xs text-slate-500">Standard</span>
          )}
        </div>
      ),
    },
    { key: 'sort_order', label: 'Order', render: (r) => r.sort_order ?? 0 },
    {
      key: 'is_active',
      label: 'Status',
      render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} />,
      filter: 'select',
      filterLabel: 'Status',
      filterAccessor: (r) => (r.is_active ? 'active' : 'inactive'),
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'created_at', label: 'Added', render: (r) => fmtDate(r.created_at), filter: 'date' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setForm(categoryToForm(r));
              setEditing(r.id);
            }}
          >
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>
            {r.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => remove(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Game Categories"
      subtitle={`${categories?.length ?? 0} categories`}
      actions={<Button icon={Plus} onClick={openCreate}>Add category</Button>}
    >
      <DataTable
        columns={columns}
        rows={categories}
        loading={loading}
        searchable
        searchKeys={['name', 'slug']}
        searchPlaceholder="Search categories…"
        noun="category"
        emptyIcon={Layers}
        emptyMessage="No categories yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add category' : 'Edit category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="category-form" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    // Only autofill the slug while creating — renaming an
                    // existing category must not silently change its slug.
                    slug: editing === 'new' ? slugify(name) : f.slug,
                  }));
                }}
                required
              />
            </Field>
            <Field label="Slug" hint="Used in player-facing URLs and reports">
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="live_casino"
                required
              />
            </Field>
            <Field label="Sort order" hint="Lowest first in menus and filters">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </Field>
          </div>
          <ImageUploadField
            label="Icon"
            value={form.icon_url}
            onChange={(url) => setForm({ ...form, icon_url: url })}
            placeholder="https://…/category.png"
          />
          <div className="flex flex-wrap gap-6 pt-2">
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
              label="Active"
            />
            <Toggle
              checked={form.is_sports}
              onChange={(v) => setForm({ ...form, is_sports: v })}
              label="Sports vertical"
            />
            <Toggle
              checked={form.is_delayed_settlement}
              onChange={(v) => setForm({ ...form, is_delayed_settlement: v })}
              label="Settles later"
            />
          </div>
          <p className="text-xs text-slate-500">
            “Sports vertical” reports this category’s rounds on the sports side of agent
            commission. “Settles later” keeps its rounds Pending in bet history until the
            provider’s result callback arrives.
          </p>
        </form>
      </Modal>
    </AdminShell>
  );
}
