// Shared formatting. Mirrors dollara/admin's helpers so the two consoles read
// identically — the affiliate programme is INR like the rest of the platform.

export function inr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

export function num(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function pct(value, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fmtDateShort(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

/** "4 min ago" style, for the activity feed. */
export function relativeTime(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDateShort(value);
}

/** Title-cases a snake_case enum value for display. */
export function label(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
