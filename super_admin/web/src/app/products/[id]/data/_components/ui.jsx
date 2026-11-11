'use client';

/* Shared helpers for the product data console: formatting, status pills,
   themed dialogs, icons and the datetime <-> input conversions. */

import Swal from 'sweetalert2';
import {
  ArrowLeftRight, Box, Boxes, CreditCard, Dice5, FileText, Gamepad2, Gift,
  Handshake, Network, Settings2, Trophy, UserCog, Users, Wallet,
} from 'lucide-react';

export function swalThemed(opts, theme) {
  const isDark = theme === 'dark';
  return Swal.fire({
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#111827',
    confirmButtonColor: '#4f46e5',
    ...opts,
  });
}

export function toast(theme, title, icon = 'success') {
  return swalThemed({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
  }, theme);
}

/* Ask for a typed confirmation before something that cannot be undone. */
export async function confirmTyped(theme, { title, html, word = 'DELETE', confirmText = 'Delete' }) {
  const result = await swalThemed({
    icon: 'warning',
    title,
    html: `${html}<br><br>Type <b>${word}</b> to confirm.`,
    input: 'text',
    inputPlaceholder: word,
    inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
    showCancelButton: true,
    confirmButtonText: confirmText,
    confirmButtonColor: '#dc2626',
    preConfirm: (value) => {
      if (value !== word) Swal.showValidationMessage(`Type ${word} to confirm`);
      return value === word;
    },
  }, theme);
  return result.isConfirmed;
}

/* Pretty label from a snake_case key. */
export function humanize(col) {
  return String(col)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID');
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/* A value as table/detail text. */
export function formatCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  if (ISO_DATETIME.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return s;
}

export const formatCount = (n) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat().format(n);

export const STATUS_COLS = new Set(['status', 'account_status', 'kyc_status', 'settle_status']);

const PILL = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
};
const STATUS_TONE = {
  active: 'green', completed: 'green', won: 'green', verified: 'green', approved: 'green',
  paid: 'green', settled: 'green', success: 'green', profit: 'green',
  pending: 'amber', info_requested: 'amber', requested: 'amber', wait: 'amber', review: 'amber',
  processing: 'blue', open: 'blue',
  draft: 'gray', inactive: 'gray', closed: 'gray', none: 'gray', cancelled: 'gray',
  expired: 'gray', void: 'gray', paused: 'gray',
  suspended: 'orange', forfeited: 'orange',
  blocked: 'red', locked: 'red', failed: 'red', rejected: 'red', lost: 'red', loss: 'red',
};

export function StatusPill({ value }) {
  const cls = PILL[STATUS_TONE[String(value).toLowerCase()] || 'indigo'];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${cls}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

/* Icon per dataset, falling back to its group's icon. */
const DATASET_ICONS = {
  users: Users,
  user_settings: Settings2,
  wallets: Wallet,
  transactions: ArrowLeftRight,
  bets: Dice5,
  games: Gamepad2,
  game_providers: Boxes,
  bonuses: Gift,
  agents: Network,
  affiliates: Handshake,
  affiliate_managers: UserCog,
  platform_settings: Settings2,
};
const GROUP_ICONS = {
  players: Users,
  finance: ArrowLeftRight,
  payments: CreditCard,
  games: Gamepad2,
  sports: Trophy,
  bonuses: Gift,
  agents: Network,
  affiliates: Handshake,
  managers: UserCog,
  content: FileText,
  system: Settings2,
};
export const datasetIcon = (key, group) => DATASET_ICONS[key] || GROUP_ICONS[group] || Box;

/* ISO timestamp <-> the value a datetime-local input takes (local time). */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const BUTTON = {
  ghost: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors',
  primary: 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  danger: 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors',
};
