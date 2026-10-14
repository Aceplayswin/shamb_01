'use client';

/**
 * A search-plus-create screen for the simple configuration lists.
 *
 * The reference splits several of these across separate "Register X" and
 * "X List" pages. Here they collapse into one: the list is the page, and
 * creating or editing happens in a modal over it.
 *
 * `formFields` entries:
 *   { name, label, type?, default?, required?, placeholder?, hint?, full?, key?, showWhen? }
 *   type: 'text' (default) | 'number' | 'select' (+options) | 'toggle' |
 *         'textarea' (+rows) | 'image' (URL-or-upload picker) | 'section'
 *         (a full-width heading with no value — groups the fields after it) |
 *         'hidden' (renders nothing; always submits the constant `value`, so a
 *         screen can pin a column the operator should not have to think about)
 *   showWhen(form): render the field only while it returns true. A value
 *     typed under one branch of a conditional form must not survive a switch to
 *     another branch, so hidden text fields are submitted as '' (the API stores
 *     NULL) rather than whatever was last typed.
 *   key: React key for when the same `name` appears under several showWhen
 *     branches with different labels; only one branch is visible at a time, so
 *     they still share a single form value.
 */

import { useMemo, useState } from 'react';
import { PlusCircle, Pencil } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Field,
  ImageUploadField,
  Input,
  Select,
  Textarea,
  Toggle,
  toast,
} from '@/components/admin/AdminShell';
import {
  FilterPanel,
  ResultTable,
  useBackofficeData,
} from '@/components/admin/Backoffice';
import { Modal } from '@/components/admin/AdminShell';

const isInput = (f) => f.type !== 'section' && f.type !== 'hidden';
const isHidden = (f) => f.type === 'hidden';
const isVisible = (f, form) => (typeof f.showWhen === 'function' ? f.showWhen(form) : true);
const fieldKey = (f) => f.key ?? f.name ?? `section-${f.label}`;

export default function CrudPage({
  title,
  subtitle,
  path,
  createPath,
  filterFields = [],
  columns,
  formFields,
  tableTitle,
  createLabel = 'Add new',
  toRow,
  pageSize = 25,
}) {
  const blankFilters = useMemo(
    () => filterFields.reduce((a, f) => ({ ...a, [f.name]: '' }), {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const blankForm = useMemo(
    () =>
      formFields.filter(isInput).reduce(
        (a, f) => ({ ...a, [f.name]: f.default ?? (f.type === 'toggle' ? true : '') }),
        {},
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [draft, setDraft] = useState(blankFilters);
  const [applied, setApplied] = useState(blankFilters);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useBackofficeData(path, applied, {
    page,
    pageSize,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(toRow ? toRow(row) : { ...blankForm, ...row });
    setOpen(true);
  };

  const setValue = (name, value) => setForm((s) => ({ ...s, [name]: value }));

  // Everything currently on screen, plus '' for text-like fields that belong
  // only to hidden branches (a name shown under several branches counts as
  // visible if any of them is). Toggles keep their value either way.
  const buildPayload = () => {
    const inputs = formFields.filter(isInput);
    const visible = new Set(inputs.filter((f) => isVisible(f, form)).map((f) => f.name));
    const payload = { ...form };
    inputs.forEach((f) => {
      if (!visible.has(f.name) && f.type !== 'toggle') payload[f.name] = '';
    });
    // Pinned constants win over whatever an edited row supplied, which is the
    // point of them: the screen asserts the value on every save.
    formFields.filter(isHidden).forEach((f) => {
      payload[f.name] = f.value;
    });
    return payload;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = JSON.stringify(buildPayload());
      if (editing) {
        await adminApi(`${path}/${editing.id}`, { method: 'PATCH', body });
        toast.success('Saved');
      } else {
        await adminApi(createPath, { method: 'POST', body });
        toast.success('Created');
      }
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const allColumns = [
    ...columns,
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(r)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const renderField = (f) => {
    if (isHidden(f) || !isVisible(f, form)) return null;
    const span = f.full ? 'sm:col-span-2' : '';

    if (f.type === 'section') {
      return (
        <div key={fieldKey(f)} className="mt-2 border-t border-slate-800 pt-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">{f.label}</p>
          {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
        </div>
      );
    }

    if (f.type === 'image') {
      // ImageUploadField renders its own <Field>; wrapping it again would nest
      // two <label>s and break the click target.
      return (
        <div key={fieldKey(f)} className={span}>
          <ImageUploadField
            label={f.label}
            value={form[f.name] ?? ''}
            onChange={(url) => setValue(f.name, url)}
            placeholder={f.placeholder}
          />
          {f.hint && <span className="mt-1.5 block text-xs text-slate-500">{f.hint}</span>}
        </div>
      );
    }

    return (
      <Field key={fieldKey(f)} label={f.label} hint={f.hint} className={span}>
        {f.type === 'select' ? (
          <Select
            value={form[f.name] ?? ''}
            onChange={(e) => setValue(f.name, e.target.value)}
            required={f.required}
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : f.type === 'toggle' ? (
          <Toggle
            checked={!!form[f.name]}
            onChange={(v) => setValue(f.name, v)}
            label={f.hint}
          />
        ) : f.type === 'textarea' ? (
          <Textarea
            rows={f.rows ?? 3}
            placeholder={f.placeholder}
            value={form[f.name] ?? ''}
            onChange={(e) => setValue(f.name, e.target.value)}
            required={f.required}
          />
        ) : (
          <Input
            type={f.type ?? 'text'}
            placeholder={f.placeholder}
            value={form[f.name] ?? ''}
            onChange={(e) => setValue(f.name, e.target.value)}
            required={f.required}
          />
        )}
      </Field>
    );
  };

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button icon={PlusCircle} onClick={openCreate}>
          {createLabel}
        </Button>
      }
    >
      <div className="space-y-5">
        {filterFields.length > 0 && (
          <FilterPanel
            fields={filterFields}
            values={draft}
            onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))}
            onSearch={() => {
              setPage(0);
              setApplied(draft);
            }}
            onClear={() => {
              setDraft(blankFilters);
              setApplied(blankFilters);
              setPage(0);
            }}
            busy={loading}
          />
        )}

        <ResultTable
          title={tableTitle ?? title}
          columns={allColumns}
          rows={data?.rows}
          loading={loading}
          error={error}
          onRetry={reload}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${title}` : createLabel}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="crud-form" type="submit" busy={busy}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="crud-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {formFields.map(renderField)}
        </form>
      </Modal>
    </AdminShell>
  );
}
