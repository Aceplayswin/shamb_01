'use client';

/* The editor for one record, or a new one. Shows every readable field as an
   input built from the product's own schema, the record's actions (the money
   and workflow operations a raw edit would get wrong), and every table with
   rows pointing at it. Saves send only the fields that changed. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle, ArrowLeft, ChevronRight, Database, Eye, Layers, Loader2, Lock,
  Pencil, Play, Plus, Save, Trash2, Undo2, X, Zap,
} from 'lucide-react';
import {
  createProductRecord, deleteProductRecord, getProductRecord, runProductRecordAction,
  updateProductRecord,
} from '@/services/api';
import { useTheme } from '@/app/providers';
import FieldInput from './FieldInput';
import {
  BUTTON, confirmTyped, formatCell, formatCount, humanize, sameValue, swalThemed, toast,
} from './ui';

const ACTION_TONE = {
  default: 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700/60',
  success: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
  danger: 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40',
};
const CONFIRM_COLOR = { default: '#4f46e5', success: '#059669', danger: '#dc2626' };

const WIDE_TYPES = new Set(['text', 'json', 'password', 'secret']);

function Shell({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" /> {children}
      </h3>
      {right}
    </div>
  );
}

/* An action's input as the field shape FieldInput understands. */
const inputField = (input) => ({
  name: input.name,
  type: input.type === 'choice' ? 'string' : input.type,
  choices: input.choices,
  nullable: !input.required,
  max_length: null,
  ref: null,
});

/* Read-only view of a list row, for products whose API predates the editor. */
export function RowPreview({ row, label, onClose }) {
  return (
    <Shell onClose={onClose}>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Eye className="h-4 w-4 text-white" />
          </span>
          <div>
            <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">{label} · #{row.id}</h2>
            <p className="text-xs text-gray-400">Row as listed</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="flex-1 space-y-3 overflow-y-auto p-5">
        {Object.entries(row).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
            <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-gray-400">{humanize(k)}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium text-gray-900 dark:text-white">{formatCell(v)}</dd>
          </div>
        ))}
      </dl>
    </Shell>
  );
}

export default function RecordDrawer({
  productId, target, createFields, datasetLabel, depth, onBack, onClose,
  onOpenRef, onShowRelated, onChanged, onCreated,
}) {
  const { theme } = useTheme();
  const swal = useCallback((opts) => swalThemed(opts, theme), [theme]);
  const creating = !!target.create;
  const label = datasetLabel(target.dataset);
  // Captured once: a table refresh behind the drawer must not reset a new
  // record's half-filled form.
  const createFieldsRef = useRef(createFields || []);

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(!creating);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [jsonInvalid, setJsonInvalid] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openAction, setOpenAction] = useState(null);
  const [actionValues, setActionValues] = useState({});
  const [actionErrors, setActionErrors] = useState({});
  const [runningAction, setRunningAction] = useState(null);

  const load = useCallback(async () => {
    if (creating) {
      setPayload({
        fields: createFieldsRef.current, record: {}, secrets: {}, related: [],
        actions: [], ref_labels: {}, read_only: false,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setPayload(await getProductRecord(productId, target.dataset, target.id));
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId, target.dataset, target.id, creating]);

  useEffect(() => {
    setDraft({});
    setFieldErrors({});
    setJsonInvalid({});
    setOpenAction(null);
    load();
  }, [load]);

  const fields = useMemo(() => payload?.fields || [], [payload]);
  const record = payload?.record || {};
  const readOnly = !!payload?.read_only;
  const dirty = Object.keys(draft).length > 0;
  const blocked = Object.values(jsonInvalid).some(Boolean);

  const metaFields = fields.filter((f) => f.primary_key || f.auto);
  const formFields = fields.filter((f) => !f.primary_key && !f.auto);
  const knownNames = new Set(fields.map((f) => f.name));
  const strayErrors = Object.entries(fieldErrors).filter(([name]) => !knownNames.has(name));

  const valueOf = (f) => {
    if (f.name in draft) return draft[f.name];
    if (creating) return f.default ?? (f.type === 'boolean' ? false : null);
    return record[f.name];
  };

  const setField = (f, value) => {
    setFieldErrors((errs) => {
      if (!(f.name in errs)) return errs;
      const next = { ...errs };
      delete next[f.name];
      return next;
    });
    setDraft((d) => {
      const next = { ...d };
      const writeOnly = f.type === 'password' || f.type === 'secret';
      if (value === undefined || (!creating && !writeOnly && sameValue(value, record[f.name]))) {
        delete next[f.name];
      } else {
        next[f.name] = value;
      }
      return next;
    });
  };

  /* Ask before throwing away unsaved edits. */
  const guard = useCallback(async (then) => {
    if (dirty) {
      const res = await swal({
        icon: 'warning',
        title: 'Discard unsaved changes?',
        text: `You have ${Object.keys(draft).length} unsaved change${Object.keys(draft).length === 1 ? '' : 's'}.`,
        showCancelButton: true,
        confirmButtonText: 'Discard',
        confirmButtonColor: '#dc2626',
      });
      if (!res.isConfirmed) return;
    }
    then();
  }, [dirty, draft, swal]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !Swal.isVisible()) guard(onClose);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guard, onClose]);

  const save = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      if (creating) {
        const res = await createProductRecord(productId, target.dataset, draft);
        setDraft({});
        toast(theme, `${label} #${res.id} created`);
        onChanged({ created: true });
        onCreated(res.id);
      } else {
        const res = await updateProductRecord(productId, target.dataset, target.id, draft);
        setPayload(res);
        setDraft({});
        const n = res.changed?.length ?? 0;
        toast(theme, n ? `Saved ${n} field${n === 1 ? '' : 's'}` : 'Nothing changed');
        onChanged({});
      }
    } catch (e) {
      if (e.fields) {
        setFieldErrors(e.fields);
        toast(theme, e.message, 'error');
      } else {
        swal({ icon: 'error', title: creating ? 'Could not create' : 'Could not save', text: e.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmTyped(theme, {
      title: `Delete ${label} #${target.id}?`,
      html: "This permanently removes the record from the product's database. Rows that "
        + "belong to it under the product's own rules go with it (for a player: wallet, "
        + 'settings, transactions, game history). The database refuses the delete if '
        + 'anything it protects still points here.',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteProductRecord(productId, target.dataset, target.id);
      toast(theme, `${label} #${target.id} deleted`);
      onChanged({ deleted: true });
      onClose();
    } catch (e) {
      swal({ icon: 'error', title: 'Could not delete', text: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const runAction = async (action, values) => {
    setRunningAction(action.key);
    setActionErrors({});
    try {
      const res = await runProductRecordAction(productId, target.dataset, target.id, action.key, values);
      setPayload(res);
      setOpenAction(null);
      setActionValues({});
      swal({ icon: 'success', title: action.label, text: res.message, timer: 4000, showConfirmButton: false });
      onChanged({});
    } catch (e) {
      if (e.fields) setActionErrors(e.fields);
      swal({ icon: 'error', title: `${action.label} failed`, text: e.message });
    } finally {
      setRunningAction(null);
    }
  };

  const startAction = async (action) => {
    if (!action.available || runningAction) return;
    if (action.inputs.length) {
      setOpenAction(action.key);
      setActionErrors({});
      setActionValues(Object.fromEntries(
        action.inputs.filter((i) => i.type === 'boolean').map((i) => [i.name, false]),
      ));
      return;
    }
    const res = await swal({
      icon: action.tone === 'danger' ? 'warning' : 'question',
      title: `${action.label}?`,
      text: action.description || `Run "${action.label}" on ${label} #${target.id}.`,
      showCancelButton: true,
      confirmButtonText: action.label,
      confirmButtonColor: CONFIRM_COLOR[action.tone] || CONFIRM_COLOR.default,
    });
    if (res.isConfirmed) runAction(action, {});
  };

  const actions = payload?.actions || [];
  const related = payload?.related || [];
  const editable = !readOnly;

  return (
    <Shell onClose={() => guard(onClose)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2.5">
          {depth > 1 && (
            <button
              type="button"
              onClick={() => guard(onBack)}
              title="Back"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            {creating ? <Plus className="h-4 w-4 text-white" /> : readOnly ? <Lock className="h-4 w-4 text-white" /> : <Pencil className="h-4 w-4 text-white" />}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-sm font-bold text-gray-900 dark:text-white">
              {label} · {creating ? 'New record' : `#${target.id}`}
            </h2>
            <p className="truncate text-xs text-gray-400">
              {creating ? 'Fill in the fields, then create it.' : payload?.title || (readOnly ? 'Audit trail · read-only' : 'Full record')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => guard(onClose)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading record…</div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{loadError}</p>
            <button type="button" onClick={load} className={BUTTON.ghost}>Try again</button>
          </div>
        ) : (
          <>
            {readOnly && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This table is an audit trail. It stays append-only so it can always be trusted, so its records cannot be edited or deleted.
              </p>
            )}

            {/* Record info */}
            {!creating && metaFields.length > 0 && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-gray-50 px-3 py-2.5 text-xs dark:bg-gray-900/60">
                {metaFields.map((f) => (
                  <span key={f.name} className="text-gray-500 dark:text-gray-400">
                    <span className="font-bold uppercase tracking-wide text-gray-400">{f.label}</span>{' '}
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCell(record[f.name])}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <section>
                <SectionTitle icon={Zap}>Actions</SectionTitle>
                {dirty && (
                  <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">Save or discard your edits before running an action.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => {
                    const busy = runningAction === a.key;
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => startAction(a)}
                        disabled={!a.available || !!runningAction || dirty}
                        title={a.available ? a.description : a.reason}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_TONE[a.tone] || ACTION_TONE.default} ${openAction === a.key ? 'ring-2 ring-indigo-500/40' : ''}`}
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                {actions.some((a) => !a.available && a.reason) && (
                  <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                    {actions.filter((a) => !a.available && a.reason).map((a) => (
                      <li key={a.key}>{a.label}: {a.reason}</li>
                    ))}
                  </ul>
                )}
                {(() => {
                  const action = actions.find((a) => a.key === openAction);
                  if (!action) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{action.label}</p>
                      {action.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{action.description}</p>}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {action.inputs.map((input) => (
                          <div key={input.name} className={input.type === 'text' ? 'sm:col-span-2' : ''}>
                            <label className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {input.label} {input.required && <span className="text-red-500">*</span>}
                            </label>
                            <FieldInput
                              field={inputField(input)}
                              value={actionValues[input.name] ?? (input.type === 'boolean' ? false : '')}
                              onChange={(v) => setActionValues((vals) => ({ ...vals, [input.name]: v ?? '' }))}
                              invalid={!!actionErrors[input.name]}
                            />
                            {actionErrors[input.name]
                              ? <p className="mt-1 text-xs text-red-500">{actionErrors[input.name]}</p>
                              : input.help && <p className="mt-1 text-xs text-gray-400">{input.help}</p>}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setOpenAction(null)} className={BUTTON.ghost}>Cancel</button>
                        <button
                          type="button"
                          onClick={() => runAction(action, actionValues)}
                          disabled={!!runningAction}
                          className={action.tone === 'danger'
                            ? 'inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50'
                            : BUTTON.primary}
                        >
                          {runningAction === action.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                          Run
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Fields */}
            <section>
              <SectionTitle
                icon={Database}
                right={dirty && <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{Object.keys(draft).length} unsaved</span>}
              >
                Fields
              </SectionTitle>
              {strayErrors.length > 0 && (
                <ul className="mb-3 space-y-0.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {strayErrors.map(([name, msg]) => <li key={name}><b>{humanize(name)}:</b> {msg}</li>)}
                </ul>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {formFields.map((f) => {
                  const changed = f.name in draft;
                  const error = fieldErrors[f.name];
                  const refLabel = payload?.ref_labels?.[f.name]?.[String(valueOf(f))];
                  return (
                    <div key={f.name} className={WIDE_TYPES.has(f.type) ? 'sm:col-span-2' : ''}>
                      <label className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span className="truncate">{f.label}</span>
                        {f.required && (creating || f.type !== 'password') && <span className="text-red-500">*</span>}
                        {(f.type === 'password' || f.type === 'secret') && !creating && (
                          <span className={`rounded px-1 py-px text-[0.55rem] ${payload?.secrets?.[f.name] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {payload?.secrets?.[f.name] ? 'set' : 'not set'}
                          </span>
                        )}
                        {changed && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" title="Changed" />}
                      </label>
                      <FieldInput
                        field={f}
                        value={valueOf(f)}
                        onChange={(v) => setField(f, v)}
                        secretSet={!!payload?.secrets?.[f.name]}
                        refLabel={refLabel}
                        onOpenRef={creating ? null : (dataset, id) => guard(() => onOpenRef(dataset, id))}
                        onInvalid={(bad) => setJsonInvalid((m) => ({ ...m, [f.name]: bad }))}
                        disabled={!editable || f.editable === false}
                        invalid={!!error}
                      />
                      {error
                        ? <p className="mt-1 text-xs text-red-500">{error}</p>
                        : f.help && <p className="mt-1 text-xs text-gray-400">{f.help}</p>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Related */}
            {!creating && related.length > 0 && (
              <section>
                <SectionTitle icon={Layers}>Related records</SectionTitle>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {related.map((r) => (
                    <button
                      key={`${r.dataset}:${r.field}`}
                      type="button"
                      onClick={() => guard(() => onShowRelated(r.dataset, r.field, target.id, payload?.title))}
                      className={`flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-left text-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-gray-700 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 ${r.count === 0 ? 'opacity-60' : ''}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-gray-800 dark:text-gray-100">{datasetLabel(r.dataset) || r.label}</span>
                        <span className="block truncate text-gray-400">by {r.field_label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {r.count === null || r.count === undefined ? '—' : `${formatCount(r.count)}${r.capped ? '+' : ''}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && !loadError && editable && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          {!creating ? (
            <button type="button" onClick={remove} disabled={deleting || saving} className={BUTTON.danger}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setDraft({}); setFieldErrors({}); }} disabled={!dirty || saving} className={BUTTON.ghost}>
              <Undo2 className="h-3.5 w-3.5" /> Discard
            </button>
            <button type="button" onClick={save} disabled={(!dirty && !creating) || blocked || saving} className={BUTTON.primary}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : creating ? <Plus className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {creating ? 'Create' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
