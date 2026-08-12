'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
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
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  History,
  Smartphone,
  FileSpreadsheet,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { adminApi, adminUploadImage, clearAdminToken, getAdminRole, getAdminToken } from '@/services/adminApi';
import { useBranding } from '@/hooks/useBranding';

// The player-facing site lives in a separate app; "View site" links out to it.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Players',
    items: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/bet-history', label: 'Bet History', icon: History },
      { href: '/bets', label: 'Bets', icon: Dices },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/transactions', label: 'Transactions', icon: Receipt },
      { href: '/deposits', label: 'Deposits', icon: ArrowDownToLine },
      { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
      { href: '/bonuses', label: 'Bonuses', icon: Gift },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/banners', label: 'Banners', icon: ImageIcon },
      { href: '/faqs', label: 'FAQs', icon: HelpCircle },
      { href: '/app', label: 'App Download', icon: Smartphone },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/games', label: 'Games', icon: Gamepad2 },
      { href: '/providers', label: 'Providers', icon: Building2 },
    ],
  },
  {
    label: 'Affiliates',
    items: [
      { href: '/affiliates/applications', label: 'Applications', icon: Inbox },
      { href: '/affiliates', label: 'Affiliate List', icon: Users, exact: true },
      { href: '/affiliates/payouts', label: 'Payout Approvals', icon: CreditCard },
      { href: '/affiliates/settings', label: 'Global Settings', icon: SlidersHorizontal },
      { href: '/affiliates/audit', label: 'Fraud/Audit', icon: ShieldCheck },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
      { href: '/ai-calls', label: 'AI Calls', icon: PhoneCall },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/staff', label: 'Manage Admin', icon: ShieldCheck },
    ],
  },
];

/* ----------------------------- Feedback helpers ---------------------------- */

const SWAL_THEME = {
  confirmButtonColor: '#6366F1',
  cancelButtonColor: '#1e293b',
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
    confirmButtonColor: danger ? '#e11d48' : '#6366F1',
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
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-indigo-500/10 text-white'
          : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400" />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition ${
          active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
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
        href="/"
        onClick={onNavigate}
        className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-5 py-[1.15rem]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600">
          <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
        </span>
        <span>
          <span className="block font-display text-base font-bold leading-none text-white">
            {branding.product_name}
          </span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Admin Console
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
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
      router.replace('/login');
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
    router.push('/login');
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  const roleLabel = role.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-60 flex-col border-r border-slate-800 bg-slate-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 lg:hidden"
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
              href={WEB_URL}
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white sm:flex"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View site
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-1.5 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white">
                {roleLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-xs font-semibold capitalize text-slate-300 sm:block">
                {roleLabel}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] animate-fade-up p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------- Primitives -------------------------------- */

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

const ACCENTS = {
  brand: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  sky: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
};

export function StatCard({ label, value, icon: Icon, accent = 'brand', hint, trend }) {
  const a = ACCENTS[accent] ?? ACCENTS.brand;
  return (
    <div className="group rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${a}`}
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
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary:
    'border border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'text-indigo-400 hover:bg-indigo-500/10',
};

export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  size = 'md',
  // `busy` swaps the icon for a spinner and disables the button, so a slow
  // mutation cannot be double-submitted. Several pages already passed this
  // prop; without it declared here it was spread onto the DOM node as an
  // unknown attribute and did nothing.
  busy = false,
  disabled,
  ...props
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

/**
 * Inline failure state with a retry.
 *
 * `useAdminData` has returned an `error` since it was written and no page ever
 * rendered it — a failed list request just showed an empty table, which reads
 * as "no data" rather than "this did not load".
 */
export function ErrorState({ message, onRetry, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-6 py-10 text-center ${className}`}
    >
      <AlertTriangle className="h-7 w-7 text-rose-400" />
      <div>
        <p className="font-semibold text-slate-200">Could not load this</p>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
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
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

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
          checked ? 'bg-indigo-500' : 'bg-slate-700'
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

const UPLOAD_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg';
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export function ImageUploadField({ id, label, value, onChange, placeholder = 'https://…' }) {
  const [mode, setMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const inputId = id || `image-upload-${label?.replace(/\s+/g, '-').toLowerCase() || 'field'}`;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) {
      toast.error('File too large (max 5MB)');
      return;
    }
    setUploading(true);
    try {
      const { url } = await adminUploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-600" />
          )}
        </span>
        <div className="flex-1">
          <div className="mb-1.5 flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`rounded px-2 py-0.5 font-semibold transition ${mode === 'url' ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Image URL
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`rounded px-2 py-0.5 font-semibold transition ${mode === 'upload' ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Upload
            </button>
          </div>
          {mode === 'url' ? (
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          ) : (
            <div>
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Choose image…'}
              </label>
              <input
                id={inputId}
                type="file"
                accept={UPLOAD_ACCEPT}
                className="hidden"
                disabled={uploading}
                onChange={handleFile}
              />
            </div>
          )}
        </div>
      </div>
    </Field>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-6xl' };
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex max-h-[90vh] w-full flex-col ${widths[size]} animate-fade-up rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="font-display text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Right-hand slide-in drawer that houses a table's filters. Opens from the
// Filters button in DataTable's toolbar; "Done" applies (when an onApply is
// wired for server-side pages) and closes, "Clear all" resets.
export function FilterDrawer({ open, onClose, title = 'Filters', subtitle, onClear, onApply, children }) {
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setRender(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!render || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-800 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-white">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 px-5 py-4">
          <Button variant="secondary" onClick={onClear} disabled={!onClear}>
            Clear all
          </Button>
          <Button
            onClick={() => {
              onApply?.();
              onClose?.();
            }}
          >
            Done
          </Button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-800 text-slate-500">
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
    // Affiliate programme statuses. Without these they all fell through to the
    // neutral slate default, which made "paid" and "rejected" look identical.
    approved: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    paid: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    requested: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    in_progress: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    rotating: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    info_requested: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    pending_affiliate: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    dormant: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    clawed_back: 'bg-red-500/15 text-red-400 ring-red-500/30',
    revoked: 'bg-red-500/15 text-red-400 ring-red-500/30',
    actioned: 'bg-red-500/15 text-red-400 ring-red-500/30',
    dismissed: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    closed: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    // Fraud risk levels, shown through the same badge.
    low: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    medium: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 ring-orange-500/30',
    critical: 'bg-red-500/15 text-red-400 ring-red-500/30',
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

/* ----------------------------- Transaction ref ----------------------------- */

function TxDetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-200">{children}</dd>
    </div>
  );
}

// A clickable reference id that opens the settlement transaction behind a
// bet/round. Fetches on first open and caches the result.
export function TxReference({ reference, transaction }) {
  const label = reference ?? transaction?.reference_number;
  const [open, setOpen] = useState(false);
  // When the full transaction is handed in (e.g. the Transactions list already
  // has it), show it directly and skip the lookup.
  const [tx, setTx] = useState(transaction ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!label) return <span className="text-slate-600">—</span>;

  const openTx = async () => {
    setOpen(true);
    if (tx) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi(
        `/api/v1/admin/transactions/by-reference/${encodeURIComponent(label)}`,
      );
      setTx(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openTx}
        title="View transaction"
        className="inline-flex max-w-[180px] items-center gap-1 truncate font-mono text-xs text-indigo-300 transition hover:text-indigo-200 hover:underline"
      >
        <Receipt className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Transaction" size="md">
        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading transaction…
          </p>
        ) : error ? (
          <p className="py-6 text-sm text-rose-400">{error}</p>
        ) : tx ? (
          <div className="space-y-3">
            <dl className="divide-y divide-slate-800 rounded-lg border border-slate-800">
              <TxDetailRow label="Reference">
                <span className="font-mono text-xs">{tx.reference_number || '—'}</span>
              </TxDetailRow>
              <TxDetailRow label="User">
                {tx.full_name ? `${tx.full_name} (${tx.username})` : tx.username}
              </TxDetailRow>
              <TxDetailRow label="Type">
                <span className="capitalize">{String(tx.type).replace(/_/g, ' ')}</span>
              </TxDetailRow>
              <TxDetailRow label="Amount">{inr(tx.amount)}</TxDetailRow>
              <TxDetailRow label="Status">
                <StatusBadge status={tx.status} />
              </TxDetailRow>
              <TxDetailRow label="Method">{tx.payment_method || '—'}</TxDetailRow>
              <TxDetailRow label="Date">{fmtDate(tx.created_at)}</TxDetailRow>
            </dl>
            {tx.notes && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                {tx.notes}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

/* -------------------------------- DataTable -------------------------------- */

function TableSkeleton({ cols }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="divide-y divide-slate-800">
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 animate-pulse rounded bg-slate-800"
                style={{ animationDelay: `${(r + c) * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const plural = (noun, n) => {
  if (n === 1) return noun;
  if (/(?:s|x|z|ch|sh)$/i.test(noun)) return `${noun}es`;
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
};

// Turn a raw cell value ("bonus_credit") into a human option label ("Bonus credit").
const prettifyValue = (v) => {
  const s = String(v).replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Windowed list of page indices for the pager: always the first & last page,
// the current one and its neighbours — `null` marks an elided gap (…).
function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const wanted = [0, totalPages - 1, page, page - 1, page + 1].filter(
    (p) => p >= 0 && p < totalPages,
  );
  const sorted = [...new Set(wanted)].sort((a, b) => a - b);
  const out = [];
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

// Footer pager: "Showing …" on the left, numbered page buttons flanked by
// prev/next arrows on the right, and an optional "N / page" size selector.
// Reused by DataTable (client-side) and by pages that page server-side.
export function Pagination({
  page,
  totalPages,
  onPage,
  total,
  perPage,
  perPageOptions = PER_PAGE_OPTIONS,
  onPerPage,
  noun = 'record',
}) {
  const single = totalPages <= 1;
  const start = total === 0 ? 0 : page * perPage + 1;
  const end = Math.min((page + 1) * perPage, total);
  const fmt = (n) => n.toLocaleString('en-IN');
  const label = single
    ? `Showing all ${fmt(total)} ${plural(noun, total)}`
    : `Showing ${fmt(start)}–${fmt(end)} of ${fmt(total)} ${plural(noun, total)}`;

  const arrowCls =
    'grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:bg-transparent';

  return (
    <div className="flex flex-col gap-3 px-1 pt-1 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={arrowCls}
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-slate-600">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`grid h-8 min-w-[2rem] place-items-center rounded-lg border px-2 text-sm font-semibold transition ${
                p === page
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className={arrowCls}
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {onPerPage && (
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="ml-1 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-7 text-sm font-medium text-slate-200 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {[...new Set([perPage, ...perPageOptions])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
          </select>
        )}
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
  filters,
  filterTitle = 'Filters',
  filterSubtitle,
  onFilterClear,
  onFilterApply,
  filterActive = false,
  serialNumber = true,
  noun = 'record',
  paginate = true,
  pageSize = 10,
  // Optional checkbox column. Selection is scoped to the visible page, because
  // the table pages client-side and "select all" across pages the user has not
  // seen is a bulk action nobody intends.
  selectable = false,
  selectedIds,
  onSelectionChange,
  rowId = (row) => row.id,
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(pageSize > 0 ? pageSize : 10);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [colFilters, setColFilters] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const isSortable = (col) => col.sortable !== false && !!col.label && col.key !== 'actions';

  const toggleSort = (col) => {
    if (!isSortable(col)) return;
    setPage(0);
    setSort((s) => {
      if (s.key !== col.key) return { key: col.key, dir: 'asc' };
      if (s.dir === 'asc') return { key: col.key, dir: 'desc' };
      return { key: null, dir: 'asc' }; // third click clears the sort
    });
  };

  // Columns that opted into drawer filtering via a `filter` descriptor.
  const filterableCols = useMemo(() => columns.filter((c) => c.filter), [columns]);

  // Columns as rendered — a running "Sl. No." is prepended unless opted out.
  const baseColumns = useMemo(
    () =>
      serialNumber
        ? [
            {
              key: '__sl_no',
              label: 'Sl. No.',
              sortable: false,
              render: (_r, i) => <span className="text-slate-400">{i + 1}</span>,
            },
            ...columns,
          ]
        : columns,
    [serialNumber, columns],
  );

  const setColFilter = (key, value) => {
    setPage(0);
    setColFilters((f) => ({ ...f, [key]: value }));
  };

  const filterAccessor = (col) => col.filterAccessor ?? ((r) => r[col.key]);

  // Distinct values for a select filter, unless the column supplies its own list.
  const optionsFor = (col) => {
    if (col.filterOptions) return col.filterOptions;
    const acc = filterAccessor(col);
    const set = new Set();
    (rows ?? []).forEach((r) => {
      const val = acc(r);
      if (val != null && val !== '') set.add(val);
    });
    return [...set]
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
      .map((val) => ({ value: String(val), label: prettifyValue(val) }));
  };

  const activeColFilters = useMemo(
    () =>
      filterableCols.filter((c) => {
        const v = colFilters[c.key];
        if (c.filter === 'date') return v && (v.from || v.to);
        return v != null && v !== '';
      }),
    [filterableCols, colFilters],
  );

  const filtered = useMemo(() => {
    let out = rows ?? [];
    if (searchable && debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      const keys = searchKeys ?? columns.map((c) => c.key);
      out = out.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
    }
    for (const col of activeColFilters) {
      const acc = filterAccessor(col);
      const v = colFilters[col.key];
      if (col.filter === 'date') {
        const from = v.from ? new Date(v.from) : null;
        const to = v.to ? new Date(`${v.to}T23:59:59.999`) : null;
        out = out.filter((row) => {
          const raw = acc(row);
          if (!raw) return false;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });
      } else if (col.filter === 'text') {
        const needle = String(v).toLowerCase();
        out = out.filter((row) => String(acc(row) ?? '').toLowerCase().includes(needle));
      } else {
        out = out.filter((row) => String(acc(row) ?? '') === String(v));
      }
    }
    return out;
  }, [rows, searchable, debouncedQuery, searchKeys, columns, activeColFilters, colFilters]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const value = (row) => (col.sortValue ? col.sortValue(row) : row[col.key]);
    const arr = [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = Number(av);
      const bn = Number(bv);
      const numeric =
        av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn);
      if (numeric) return an - bn;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    return sort.dir === 'desc' ? arr.reverse() : arr;
  }, [filtered, sort, columns]);

  const total = sorted.length;
  const totalPages = paginate ? Math.max(1, Math.ceil(total / perPage)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = paginate
    ? sorted.slice(safePage * perPage, safePage * perPage + perPage)
    : sorted;

  // --- checkbox selection (opt-in) ---
  const selection = selectedIds ?? [];
  const pageIds = useMemo(() => pageRows.map(rowId), [pageRows, rowId]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selection.includes(id));

  const toggleRow = (id) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id],
    );
  };

  const togglePage = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allOnPageSelected
        ? selection.filter((id) => !pageIds.includes(id))
        : [...new Set([...selection, ...pageIds])],
    );
  };

  const displayColumns = useMemo(() => {
    if (!selectable) return baseColumns;
    return [
      {
        key: '__select',
        label: (
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={togglePage}
            aria-label="Select all rows on this page"
            className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/40"
          />
        ),
        sortable: false,
        render: (row) => (
          <input
            type="checkbox"
            checked={selection.includes(rowId(row))}
            onChange={() => toggleRow(rowId(row))}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
            className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/40"
          />
        ),
      },
      ...baseColumns,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectable, baseColumns, selection, allOnPageSelected, pageIds]);

  const hasFilterUi = !!filters || filterableCols.length > 0;
  const filterActiveResolved = filterActive || activeColFilters.length > 0;
  const clearAll =
    onFilterClear || filterableCols.length > 0
      ? () => {
          setColFilters({});
          onFilterClear?.();
        }
      : undefined;

  const filterBody = (
    <>
      {filters}
      {filterableCols.map((col) => {
        const label = col.filterLabel ?? col.label;
        if (col.filter === 'date') {
          const v = colFilters[col.key] ?? {};
          return (
            <Field key={col.key} label={label}>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={v.from ?? ''}
                  onChange={(e) => setColFilter(col.key, { ...v, from: e.target.value })}
                />
                <Input
                  type="date"
                  value={v.to ?? ''}
                  onChange={(e) => setColFilter(col.key, { ...v, to: e.target.value })}
                />
              </div>
            </Field>
          );
        }
        if (col.filter === 'text') {
          return (
            <Field key={col.key} label={label}>
              <Input
                value={colFilters[col.key] ?? ''}
                onChange={(e) => setColFilter(col.key, e.target.value)}
                placeholder={col.filterPlaceholder}
              />
            </Field>
          );
        }
        return (
          <Field key={col.key} label={label}>
            <Select
              value={colFilters[col.key] ?? ''}
              onChange={(e) => setColFilter(col.key, e.target.value)}
            >
              <option value="">All</option>
              {optionsFor(col).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        );
      })}
    </>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {(searchable || hasFilterUi) && (
          <div className="h-14 w-full animate-pulse rounded-xl bg-slate-800" />
        )}
        <TableSkeleton cols={displayColumns.length} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(searchable || hasFilterUi) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}
            {hasFilterUi && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                  showFilters || filterActiveResolved
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {filterActiveResolved && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {!pageRows.length ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
          hint={emptyHint ?? (query ? 'Try a different search term.' : undefined)}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40">
                  {displayColumns.map((col) => {
                    const sortable = isSortable(col);
                    const active = sort.key === col.key;
                    const alignCls =
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
                    return (
                      <th
                        key={col.key}
                        onClick={sortable ? () => toggleSort(col) : undefined}
                        className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${alignCls} ${
                          sortable ? 'cursor-pointer select-none transition hover:text-slate-300' : ''
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.label}
                          {sortable &&
                            (active ? (
                              sort.dir === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5 text-indigo-400" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 text-slate-600" />
                            ))}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    className="border-b border-slate-800/70 transition last:border-0 hover:bg-slate-800/40"
                  >
                    {displayColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 align-middle text-slate-200 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                              ? 'text-center'
                              : ''
                        }`}
                      >
                        {col.render
                          ? col.render(row, safePage * perPage + i)
                          : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginate && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPage={setPage}
              total={total}
              perPage={perPage}
              onPerPage={(n) => {
                setPerPage(n);
                setPage(0);
              }}
              noun={noun}
            />
          )}
        </>
      )}

      {hasFilterUi && (
        <FilterDrawer
          open={showFilters}
          onClose={() => setShowFilters(false)}
          title={filterTitle}
          subtitle={filterSubtitle}
          onClear={clearAll}
          onApply={onFilterApply}
        >
          {filterBody}
        </FilterDrawer>
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
