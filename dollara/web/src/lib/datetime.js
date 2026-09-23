/**
 * Date and time formatting for the player site.
 *
 * Every timestamp on the platform is shown in full — day, month, year and a
 * wall-clock time down to the second. Players reconcile deposits, withdrawals
 * and bet results against these strings, and a stamp rounded to the minute
 * loses the ordering of events that land in the same minute.
 *
 * `dateStyle`/`timeStyle` cannot be combined with a `second` field, so the
 * parts are spelled out explicitly. The themes each used to carry their own
 * copy of this logic; they all call in here now so the formats cannot drift.
 *
 * The API sends UTC instants. Without an explicit `timeZone` the browser
 * would render them in whatever zone the viewer's device is set to, so a
 * player abroad would see a different wall-clock time from the one the
 * platform (and the admin console) works in. Every stamp is pinned to IST.
 */

const TIME_ZONE = 'Asia/Kolkata';
const DATE_PARTS = { day: '2-digit', month: 'short', year: 'numeric', timeZone: TIME_ZONE };
const TIME_PARTS = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
};

/** Returns a valid Date, or null for empty/unparseable input. */
function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Mar 2024, 10:00:45 pm" — the default for any event timestamp. */
export function formatDateTime(value, fallback = '') {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleString('en-IN', { ...DATE_PARTS, ...TIME_PARTS });
}

/**
 * "12 Mar 2024" — only where there is genuinely no time of day to show, such
 * as a date-range bound. Prefer {@link formatDateTime} for anything that
 * happened at a moment.
 */
export function formatDateOnly(value, fallback = '') {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', DATE_PARTS);
}

/** "10:00:45 pm" — the time half, when the date is already shown alongside. */
export function formatTimeOnly(value, fallback = '') {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-IN', TIME_PARTS);
}
