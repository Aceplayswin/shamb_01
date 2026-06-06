'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Building2,
  Dices,
  Gift,
  Settings,
  PhoneCall,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Search,
  ExternalLink,
  Sparkles,
  Inbox,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { adminApi, clearAdminToken, getAdminRole, getAdminToken } from '@/services/adminApi';
import { useBranding } from '@/hooks/useBranding';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Players',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/bets', label: 'Bets', icon: Dices },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/transactions', label: 'Transactions', icon: Receipt },
      { href: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine },
      { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
      { href: '/admin/bonuses', label: 'Bonuses', icon: Gift },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/games', label: 'Games', icon: Gamepad2 },
      { href: '/admin/providers', label: 'Providers', icon: Building2 },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/ai-calls', label: 'AI Calls', icon: PhoneCall },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/staff', label: 'Staff', icon: ShieldCheck },
    ],
  },
];

/* ----------------------------- Feedback helpers ---------------------------- */

const SWAL_THEME = {
  background: '#15131f',
  color: '#f1f5f9',
  confirmButtonColor: '#ff9800',
  cancelButtonColor: '#211d30',
};

const toastMixin = () =>
  Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    ...SWAL_THEME,
  });

export const toast = {
  success: (title) => toastMixin().fire({ icon: 'success', title }),
  error: (title) => toastMixin().fire({ icon: 'error', title }),
  info: (title) => toastMixin().fire({ icon: 'info', title }),
};

export async function confirmDialog({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Confirm',
  icon = 'warning',
  danger = false,
} = {}) {
  const res = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    ...SWAL_THEME,
    confirmButtonColor: danger ? '#ef4444' : '#ff9800',
  });
  return res.isConfirmed;
}

/* --------------------------------- Shell ---------------------------------- */

function NavLink({ href, label, icon: Icon, exact, onNavigate }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-gradient-to-r from-brand-500/20 to-accent-500/10 text-white'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-brand-600" />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition ${
          active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}
      />
      {label}
    </Link>
  );
}

function SidebarContent({ onNavigate }) {
  const branding = useBranding();
  return (
    <>
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex shrink-0 items-center gap-3 px-5 py-5"
      >
        <span className="relative grid h-10 w-10 place-items-center">
          <span
            className="absolute inset-0 rounded-2xl opacity-60 blur-[6px]"
            style={{ backgroundColor: branding.theme_color }}
          />
          <span
            className="relative grid h-10 w-10 place-items-center rounded-2xl shadow-glow"
            style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
          >
            <Sparkles className="h-5 w-5 text-surface-950" strokeWidth={2.5} />
          </span>
        </span>
        <span>
          <span className="block font-display text-lg font-extrabold leading-none text-white">
            {branding.product_name}
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-slate-500">
            Admin Console
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.22em] text-slate-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AdminShell({ children, title, subtitle, actions }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace('/admin/login');
      return;
    }
    setRole(getAdminRole() || 'admin');
    setReady(true);
  }, [router]);

  const logout = async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      text: 'You will need to log in again to access the console.',
      confirmText: 'Sign out',
    });
    if (!ok) return;
    clearAdminToken();
    router.push('/admin/login');
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-900">
        <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
      </div>
    );
  }

  const roleLabel = role.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-surface-900 text-slate-200">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-surface-950/80 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/[0.06] bg-surface-950">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-surface-900/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold text-white sm:text-xl">
              {title}
            </h1>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {actions}
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-brand-400/40 hover:text-white sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View site
            </Link>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-800/60 py-1.5 pl-1.5 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-600 text-xs font-bold text-surface-950">
                {roleLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-xs font-semibold capitalize text-slate-300 sm:block">
                {roleLabel}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:border-red-400/40 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] animate-fade-up p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------- Primitives -------------------------------- */

export function Card({ children, className = '' }) {
  return <div className={`glass shadow-card ${className}`}>{children}</div>;
}

const ACCENTS = {
  brand: { ring: 'text-brand-400', bg: 'from-brand-500/20 to-brand-500/5' },
  accent: { ring: 'text-accent-400', bg: 'from-accent-500/20 to-accent-500/5' },
  emerald: { ring: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5' },
  rose: { ring: 'text-rose-400', bg: 'from-rose-500/20 to-rose-500/5' },
  sky: { ring: 'text-sky-400', bg: 'from-sky-500/20 to-sky-500/5' },
};

export function StatCard({ label, value, icon: Icon, accent = 'brand', hint, trend }) {
  const a = ACCENTS[accent] ?? ACCENTS.brand;
  return (
    <div className="glass group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-black text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.bg} ring-1 ring-white/10 ${a.ring}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {trend != null && (
        <p
          className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${
            trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {trend >= 0 ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {Math.abs(trend)}% vs prev.
        </p>
      )}
    </div>
  );
}

const BTN_VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-400 to-brand-600 text-surface-950 shadow-glow hover:from-brand-300 hover:to-brand-500',
  secondary:
    'border border-white/10 text-slate-200 hover:border-white/25 hover:bg-white/5',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  danger: 'bg-red-600/90 text-white hover:bg-red-500',
  ghost: 'text-brand-400 hover:bg-brand-500/10',
};

export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  size = 'md',
  ...props
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      )}
      {children}
    </label>
  );
}

const INPUT_CLS =
  'w-full rounded-xl border border-white/10 bg-surface-950/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/40';

export function Input({ className = '', ...props }) {
  return <input className={`${INPUT_CLS} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${INPUT_CLS} ${className}`} {...props} />;
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`${INPUT_CLS} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-slate-300"
    >
      <span
        className={`relative h-6 w-10 rounded-full transition ${
          checked ? 'bg-brand-500' : 'bg-surface-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`glass-strong relative w-full ${widths[size]} animate-fade-up shadow-card`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="font-display text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-800 text-slate-600">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-display text-base font-bold text-slate-300">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    completed: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    verified: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    won: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    processing: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    open: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    draft: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    paused: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    rejected: 'bg-red-500/15 text-red-400 ring-red-500/30',
    failed: 'bg-red-500/15 text-red-400 ring-red-500/30',
    suspended: 'bg-red-500/15 text-red-400 ring-red-500/30',
    blocked: 'bg-red-500/15 text-red-400 ring-red-500/30',
    lost: 'bg-red-500/15 text-red-400 ring-red-500/30',
    cancelled: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    inactive: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    none: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
  };
  const cls = map[status] ?? 'bg-slate-500/15 text-slate-400 ring-slate-500/30';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${cls}`}
    >
      {String(status ?? '—').replace(/_/g, ' ')}
    </span>
  );
}

/* -------------------------------- DataTable -------------------------------- */

function TableSkeleton({ cols }) {
  return (
    <div className="glass overflow-hidden">
      <div className="space-y-px">
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 animate-pulse rounded bg-white/[0.06]"
                style={{ animationDelay: `${(r + c) * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No records found',
  emptyIcon,
  emptyHint,
  searchable = false,
  searchKeys,
  searchPlaceholder = 'Search…',
  pageSize = 0,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!searchable || !query.trim()) return rows;
    const q = query.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return rows.filter((row) =>
      keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }, [rows, query, searchable, searchKeys, columns]);

  const totalPages = pageSize ? Math.ceil(filtered.length / pageSize) : 1;
  const pageRows = pageSize ? filtered.slice(page * pageSize, page * pageSize + pageSize) : filtered;

  if (loading) {
    return (
      <div className="space-y-3">
        {searchable && <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-white/[0.06]" />}
        <TableSkeleton cols={columns.length} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-surface-950/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
      )}

      {!pageRows.length ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
          hint={emptyHint ?? (query ? 'Try a different search term.' : undefined)}
        />
      ) : (
        <div className="glass overflow-x-auto shadow-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.03]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5 align-middle text-slate-200">
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Charts --------------------------------- */

export function BarChart({ data, series }) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))
  );
  return (
    <div className="flex h-52 items-end gap-2">
      {data.map((d) => (
        <div key={d.label ?? d.date} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full items-end justify-center gap-1">
            {series.map((s) => {
              const v = Number(d[s.key]) || 0;
              const h = `${(v / max) * 100}%`;
              return (
                <div
                  key={s.key}
                  title={`${s.label}: ${v.toLocaleString('en-IN')}`}
                  className={`w-full max-w-[14px] rounded-t-md ${s.color} transition-all`}
                  style={{ height: h, minHeight: v > 0 ? '4px' : '0px' }}
                />
              );
            })}
          </div>
          <span className="text-[0.65rem] font-medium text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartLegend({ series }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------- Data hook ------------------------------- */

export function useAdminData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = () => {
    if (!fetcher) return;
    setLoading(true);
    setError(null);
    adminApi(fetcher)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (s) => (s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
