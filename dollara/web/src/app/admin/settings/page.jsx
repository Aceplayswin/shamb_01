'use client';

import { useMemo, useState } from 'react';
import {
  Settings as SettingsIcon,
  Pencil,
  Save,
  X,
  Search,
  Globe,
  Wallet,
  Languages,
  SlidersHorizontal,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Card,
  Button,
  Input,
  Textarea,
  EmptyState,
  toast,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';

/* Friendly metadata for known settings. Unknown keys fall back to "Other". */
const SETTING_META = {
  site_name: {
    group: 'General',
    label: 'Site name',
    description: 'Public brand name shown across the platform.',
    type: 'text',
  },
  supported_languages: {
    group: 'Localization',
    label: 'Supported languages',
    description: 'Languages players can switch between.',
    type: 'tags',
  },
  min_deposit: {
    group: 'Limits',
    label: 'Minimum deposit',
    description: 'Smallest amount a player can deposit.',
    type: 'currency',
  },
  min_withdrawal: {
    group: 'Limits',
    label: 'Minimum withdrawal',
    description: 'Smallest amount a player can withdraw.',
    type: 'currency',
  },
  auto_approve_withdrawal_limit: {
    group: 'Limits',
    label: 'Auto-approve withdrawal limit',
    description: 'Withdrawals at or below this amount are approved automatically.',
    type: 'currency',
  },
};

const GROUPS = {
  General: { icon: SlidersHorizontal, accent: 'text-indigo-400' },
  Limits: { icon: Wallet, accent: 'text-emerald-400' },
  Localization: { icon: Languages, accent: 'text-indigo-400' },
  Security: { icon: Globe, accent: 'text-sky-400' },
  Other: { icon: SettingsIcon, accent: 'text-slate-400' },
};
const GROUP_ORDER = ['General', 'Limits', 'Localization', 'Security', 'Other'];

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
};

const humanize = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const metaFor = (key) =>
  SETTING_META[key] ?? { group: 'Other', label: humanize(key), description: '', type: 'auto' };

const resolveType = (value, meta) => {
  if (meta.type && meta.type !== 'auto') return meta.type;
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'tags';
  if (typeof value === 'object' && value !== null) return 'json';
  return 'text';
};

/* ----------------------------- Tag (chip) editor --------------------------- */

function TagEditor({ value, onChange }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 py-1 pl-2.5 pr-1.5 text-sm text-white"
          >
            <span>{LANGUAGE_NAMES[tag] ? `${LANGUAGE_NAMES[tag]} · ${tag}` : tag}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-white/10 hover:text-rose-400"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add code e.g. kn"
          className="max-w-[200px]"
        />
        <Button variant="secondary" size="sm" icon={Plus} type="button" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Value display ----------------------------- */

function ValueDisplay({ type, value }) {
  if (type === 'currency') return <span className="font-semibold text-white">{inr(value)}</span>;
  if (type === 'number') return <span className="font-semibold text-white">{Number(value).toLocaleString('en-IN')}</span>;
  if (type === 'tags')
    return (
      <div className="flex flex-wrap gap-1.5">
        {(value ?? []).map((t) => (
          <span key={t} className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
            {LANGUAGE_NAMES[t] ?? t}
          </span>
        ))}
      </div>
    );
  if (type === 'json')
    return (
      <pre className="max-w-full overflow-x-auto rounded-lg bg-slate-950/60 p-2 text-xs text-slate-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  return <span className="font-medium text-white">{String(value)}</span>;
}

/* --------------------------------- Setting row ----------------------------- */

function SettingRow({ item, busy, onSave }) {
  const meta = metaFor(item.key);
  const type = resolveType(item.value, meta);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const startEdit = () => {
    if (type === 'tags') setDraft(Array.isArray(item.value) ? [...item.value] : []);
    else if (type === 'json') setDraft(JSON.stringify(item.value, null, 2));
    else setDraft(String(item.value ?? ''));
    setEditing(true);
  };

  const commit = async () => {
    let value = draft;
    if (type === 'currency' || type === 'number') value = Number(draft);
    else if (type === 'json') {
      try {
        value = JSON.parse(draft);
      } catch {
        toast.error('Invalid JSON');
        return;
      }
    }
    const ok = await onSave(item.key, value);
    if (ok) setEditing(false);
  };

  // Booleans are always inline — no edit mode needed.
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="font-medium text-white">{meta.label}</p>
          {meta.description && <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(item.key, !item.value)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${item.value ? 'bg-indigo-500' : 'bg-slate-700'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${item.value ? 'left-[1.375rem]' : 'left-0.5'}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{meta.label}</p>
            <code className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[0.65rem] text-slate-500">
              {item.key}
            </code>
          </div>
          {meta.description && <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>}

          {!editing && (
            <div className="mt-2 text-sm">
              <ValueDisplay type={type} value={item.value} />
            </div>
          )}
        </div>

        {!editing && (
          <Button variant="secondary" size="sm" icon={Pencil} onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          {type === 'tags' ? (
            <TagEditor value={draft} onChange={setDraft} />
          ) : type === 'json' ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} className="font-mono text-xs" />
          ) : type === 'currency' ? (
            <div className="relative max-w-[220px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
              <Input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="pl-7"
                autoFocus
              />
            </div>
          ) : type === 'number' ? (
            <Input type="number" value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-[220px]" autoFocus />
          ) : (
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="max-w-sm" autoFocus />
          )}

          <div className="mt-3 flex gap-2">
            <Button size="sm" icon={Save} disabled={busy} onClick={commit}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" size="sm" icon={X} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function AdminSettingsPage() {
  const { data: settings, loading, reload } = useAdminData('/api/v1/admin/settings');
  const [busyKey, setBusyKey] = useState(null);
  const [query, setQuery] = useState('');

  const persist = async (key, value) => {
    setBusyKey(key);
    try {
      await adminApi(`/api/v1/admin/settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
      toast.success(`${metaFor(key).label} updated`);
      reload();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const grouped = useMemo(() => {
    const out = {};
    (settings ?? [])
      .filter((s) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return s.key.toLowerCase().includes(q) || metaFor(s.key).label.toLowerCase().includes(q);
      })
      .forEach((s) => {
        const g = metaFor(s.key).group;
        (out[g] ??= []).push(s);
      });
    return out;
  }, [settings, query]);

  const visibleGroups = GROUP_ORDER.filter((g) => grouped[g]?.length);

  return (
    <AdminShell
      title="Platform Settings"
      subtitle="Global configuration for the platform"
      actions={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass h-48 animate-pulse" />
          ))}
        </div>
      ) : settings?.length ? (
        <>
          <div className="relative mb-5 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings…"
              className="w-full rounded-xl border border-white/10 bg-surface-950/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
            />
          </div>

          {visibleGroups.length ? (
            <div className="space-y-5">
              {visibleGroups.map((groupName) => {
                const { icon: Icon, accent } = GROUPS[groupName];
                return (
                  <Card key={groupName} className="overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl bg-surface-800 ring-1 ring-white/10 ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="font-display text-base font-bold text-white">{groupName}</h2>
                        <p className="text-xs text-slate-500">
                          {grouped[groupName].length} setting{grouped[groupName].length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {grouped[groupName].map((item) => (
                        <SettingRow
                          key={item.key}
                          item={item}
                          busy={busyKey === item.key}
                          onSave={persist}
                        />
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Search} title="No matching settings" hint="Try a different search term." />
          )}
        </>
      ) : (
        <EmptyState
          icon={SettingsIcon}
          title="No settings found"
          hint="Run the seed command to create platform defaults."
        />
      )}
    </AdminShell>
  );
}
