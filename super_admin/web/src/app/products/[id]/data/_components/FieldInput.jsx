'use client';

/* One editable value, rendered from the field schema the product sends
   (type, choices, nullability, what an id points at). `onChange(undefined)`
   means "leave this field as it is" and drops it from the pending changes. */

import { useEffect, useState } from 'react';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import { isoToLocalInput, localInputToIso } from './ui';

const INPUT =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800/60 dark:disabled:text-gray-400';
const OK = 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600';
const BAD = 'border-red-400 focus:border-red-500 focus:ring-red-500 dark:border-red-500';

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SecretInput({ field, value, onChange, secretSet, disabled, cls }) {
  const [show, setShow] = useState(false);
  const clearing = value === null;
  const placeholder = clearing
    ? 'Will be cleared on save'
    : field.type === 'password'
      ? (secretSet ? 'Set · type a new password to replace it' : 'Not set · type a password')
      : (secretSet ? '•••••••• set · type to replace' : 'Not set');
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          className={`${cls} pr-9`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {field.type === 'secret' && field.nullable && (secretSet || clearing) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(clearing ? undefined : null)}
          className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {clearing ? 'Keep' : 'Clear'}
        </button>
      )}
    </div>
  );
}

const toJsonText = (value) => (value === null || value === undefined ? '' : JSON.stringify(value, null, 2));

function JsonInput({ value, nullable, onChange, onInvalid, disabled, cls }) {
  const [text, setText] = useState(() => toJsonText(value));
  const [error, setError] = useState(null);

  // A reload from outside (a save, a discard) replaces the text, unless it
  // already says the same thing — then the user's own formatting is kept.
  useEffect(() => {
    let current;
    try {
      current = JSON.stringify(text.trim() === '' ? null : JSON.parse(text));
    } catch {
      current = undefined;
    }
    if (current !== JSON.stringify(value ?? null)) {
      setText(toJsonText(value));
      setError(null);
      onInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (next) => {
    setText(next);
    if (next.trim() === '') {
      if (nullable) {
        setError(null);
        onInvalid(false);
        onChange(null);
      } else {
        setError('A value is required.');
        onInvalid(true);
      }
      return;
    }
    try {
      const parsed = JSON.parse(next);
      setError(null);
      onInvalid(false);
      onChange(parsed);
    } catch {
      setError('Not valid JSON yet.');
      onInvalid(true);
    }
  };

  return (
    <div>
      <textarea
        rows={Math.min(12, Math.max(3, text.split('\n').length))}
        spellCheck={false}
        value={text}
        disabled={disabled}
        onChange={(e) => handle(e.target.value)}
        className={`${cls} font-mono text-xs ${error ? BAD : ''}`}
      />
      {error && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{error}</p>}
    </div>
  );
}

export default function FieldInput({
  field, value, onChange, secretSet = false, refLabel = null, onOpenRef = null,
  onInvalid = () => {}, disabled = false, invalid = false,
}) {
  const { type, nullable, choices } = field;
  const cls = `${INPUT} ${invalid ? BAD : OK}`;
  const empty = nullable ? null : '';

  if (type === 'boolean') {
    return <Toggle value={!!value} onChange={onChange} disabled={disabled} />;
  }

  if (choices && choices.length) {
    const current = value === null || value === undefined ? '' : String(value);
    const known = choices.some((c) => String(c.value) === current);
    return (
      <select
        value={current}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? empty : e.target.value)}
        className={cls}
      >
        {(nullable || current === '') && <option value="">{nullable ? '— None —' : 'Choose…'}</option>}
        {current !== '' && !known && <option value={current}>{current} (current)</option>}
        {choices.map((c) => (
          <option key={String(c.value)} value={String(c.value)}>{c.label}</option>
        ))}
      </select>
    );
  }

  if (type === 'password' || type === 'secret') {
    return (
      <SecretInput field={field} value={value} onChange={onChange} secretSet={secretSet}
        disabled={disabled} cls={cls} />
    );
  }

  if (type === 'json') {
    return (
      <JsonInput value={value} nullable={nullable} onChange={onChange}
        onInvalid={onInvalid} disabled={disabled} cls={cls} />
    );
  }

  if (type === 'text') {
    return (
      <textarea
        rows={3}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? empty : e.target.value)}
        className={cls}
      />
    );
  }

  if (type === 'datetime' || type === 'date' || type === 'time') {
    const inputType = type === 'datetime' ? 'datetime-local' : type;
    const shown = type === 'datetime' ? isoToLocalInput(value) : (value ?? '');
    return (
      <input
        type={inputType}
        step={type === 'date' ? undefined : 1}
        value={shown}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) return onChange(empty);
          return onChange(type === 'datetime' ? localInputToIso(raw) : raw);
        }}
        className={cls}
      />
    );
  }

  if (type === 'integer') {
    const hasRef = field.ref && value !== null && value !== undefined && value !== '';
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={1}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? empty : e.target.value)}
          className={cls}
        />
        {hasRef && onOpenRef && (
          <button
            type="button"
            onClick={() => onOpenRef(field.ref, value)}
            title="Open the record this points at"
            className="inline-flex max-w-[45%] shrink-0 items-center gap-1 truncate rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{refLabel || `#${value}`}</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'decimal') {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? empty : e.target.value)}
        className={`${cls} tabular-nums`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      maxLength={field.max_length || undefined}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? empty : e.target.value)}
      className={cls}
    />
  );
}
