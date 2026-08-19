// Shared formatting. Mirrors dollara/affiliate's helpers so the consoles read
// identically — the platform is INR throughout.

/** Money, always two decimals, so a column of numbers lines up. */
export function money(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function num(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function pct(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

/**
 * The Tailwind class for a signed number.
 *
 * Every P&L cell on this panel is coloured the same way, so the rule lives in
 * one place: green up, red down, neutral at exactly zero.
 */
export function signClass(value) {
  const n = Number(value || 0);
  if (n > 0) return 'text-up';
  if (n < 0) return 'text-down';
  return 'text-ink-muted';
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

/** `MM/DD/YYYY`, the format the panel's period control displays. */
export function fmtRangeLabel(from, to) {
  const one = (value) => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${m}/${d}/${y}`;
  };
  return `${one(from)} - ${one(to)}`;
}

/** Today as `YYYY-MM-DD` in the browser's timezone, not UTC. */
export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Title-cases a snake_case enum value for display. */
export function label(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
