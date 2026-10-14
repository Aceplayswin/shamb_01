'use client';

import { useMemo, useState } from 'react';
import { HelpCircle, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Textarea,
  Toggle,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const emptyFaq = {
  question: '',
  answer: '',
  sort_order: 0,
  status: 'active',
};

export default function AdminFaqsPage() {
  const { data: faqs, loading, reload } = useAdminData('/api/v1/admin/faqs');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFaq);
  const [busy, setBusy] = useState(false);
  // id of the FAQ whose order is being changed, so its arrows disable while the
  // swap is in flight and we avoid double-submits.
  const [reordering, setReordering] = useState(null);

  // The API already returns FAQs in display order (sort_order, id); keep a stable
  // copy so the up/down arrows operate on exactly what's on screen.
  const ordered = useMemo(
    () =>
      [...(faqs ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.id ?? 0) - (b.id ?? 0),
      ),
    [faqs],
  );

  const save = async (e) => {
    e.preventDefault();
    if (!form.question.trim()) {
      toast.error('A question is required');
      return;
    }
    if (!form.answer.trim()) {
      toast.error('An answer is required');
      return;
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/faqs/create', { method: 'POST', body: JSON.stringify(form) });
        toast.success('FAQ created');
      } else {
        await adminApi(`/api/v1/admin/faqs/${editing}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('FAQ updated');
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
    if (!window.confirm('Delete this FAQ? This cannot be undone.')) return;
    try {
      await adminApi(`/api/v1/admin/faqs/${id}`, { method: 'DELETE' });
      toast.success('FAQ deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Move a FAQ one place up (-1) or down (+1). Because saved sort_order values may
  // be duplicated, we re-number the whole list sequentially and only persist the
  // rows whose position actually changed — deterministic regardless of prior state.
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];

    const updates = next
      .map((f, i) => ({ id: f.id, sort_order: i, prev: f.sort_order ?? 0 }))
      .filter((u) => u.sort_order !== u.prev);

    setReordering(next[target].id);
    try {
      await Promise.all(
        updates.map((u) =>
          adminApi(`/api/v1/admin/faqs/${u.id}`, {
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
        const index = ordered.findIndex((f) => f.id === r.id);
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
      key: 'question',
      label: 'Question',
      render: (r) => (
        <div className="max-w-[520px]">
          <p className="font-medium text-white">{r.question}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{r.answer}</p>
        </div>
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
                question: r.question || '',
                answer: r.answer || '',
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
      title="FAQs"
      subtitle={`${faqs?.length ?? 0} FAQs · shown in the "Frequently asked questions" section on every site theme · use ↑ ↓ to set the order`}
      actions={<Button icon={Plus} onClick={() => { setForm(emptyFaq); setEditing('new'); }}>Add FAQ</Button>}
    >
      <DataTable
        columns={columns}
        rows={ordered}
        loading={loading}
        searchable
        searchKeys={['question', 'answer']}
        searchPlaceholder="Search FAQs…"
        noun="FAQ"
        emptyIcon={HelpCircle}
        emptyMessage="No FAQs yet. Add one to show it on the site."
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add FAQ' : 'Edit FAQ'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="faq-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form id="faq-form" onSubmit={save} className="grid gap-4">
          <Field label="Question">
            <Input
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="e.g. How do I withdraw my winnings?"
              maxLength={300}
            />
          </Field>
          <Field label="Answer">
            <Textarea
              rows={5}
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              placeholder="Write the answer shown when the question is expanded…"
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
            Order is set from the FAQs list with the ↑ ↓ arrows once the FAQ is saved.
          </p>
        </form>
      </Modal>
    </AdminShell>
  );
}
