'use client';

// Theme5 Profile — the player's own account details from the shared auth store,
// light portal style.
//
// Read-only by design: everything here comes straight off `me` (see
// services/graphql.js). Money movement lives on Wallet and the statement pages,
// so this page deliberately carries no transactions — just who the account is,
// how it is secured, and where to go next.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Crown,
  KeyRound,
  LogOut,
  ShieldCheck,
  Users as UsersIcon,
  Wallet as WalletIcon,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { formatDateTime as fmtDateTime } from '@/lib/datetime';
import { T5Card, T5FormPage, t5BtnOutline } from '../components/ui';

// ── formatting ──────────────────────────────────────────────────────────────
// Every value can be null (a fresh account, or a field the tenant never fills),
// so each helper falls back to a dash rather than printing "null"/"Invalid Date".
const DASH = '—';

// "12 Mar 2024" — day-first, matching the ₹/en-IN formatting used elsewhere.
// "12 Mar 2024, 10:00:45 pm" — the full stamp, seconds included, from the
// shared formatter. Both member-since and last-login are real moments, so
// neither hides its time of day.
const formatDate = (iso) => fmtDateTime(iso, DASH);
const formatDateTime = (iso) => fmtDateTime(iso, DASH);

// snake_case enums off the API ("prefer_not_to_say") read as words.
function titleCase(value) {
  if (!value) return DASH;
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── pieces ──────────────────────────────────────────────────────────────────

// One label/value line. `mono` keeps codes and numbers on tabular figures so
// they line up down the column instead of wobbling.
function Row({ label, value, mono = false, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-[#64748b]">{label}</span>
      {children ?? (
        <span
          className={`min-w-0 truncate text-right text-sm font-bold text-[#0f1b33] ${
            mono ? 'tabular-nums' : ''
          }`}
        >
          {value ?? DASH}
        </span>
      )}
    </div>
  );
}

// Card heading — a small caps label above each group of rows, so the page reads
// as sections rather than one long undifferentiated list.
function GroupHead({ icon: Icon, children }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#1d4ed8]" />
      <h2 className="text-[0.7rem] font-black uppercase tracking-wide text-[#64748b]">
        {children}
      </h2>
    </div>
  );
}

// Account status as a coloured pill: "active" should read as reassuring, and
// anything else as something to act on, without the player parsing the word.
function StatusPill({ status }) {
  const value = (status ?? '').toLowerCase();
  const ok = value === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-wide ${
        ok ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#b91c1c]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`} />
      {titleCase(status) === DASH ? 'Unknown' : titleCase(status)}
    </span>
  );
}

// Identity header — avatar initials, display name, and the @username / VIP and
// demo markers, so the top of the page says who is signed in at a glance.
function IdentityCard({ user, username }) {
  const name = user?.full_name || username || 'Player';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <T5Card className="mt-4 flex items-center gap-4 p-5 sm:p-6">
      <span
        aria-hidden
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#101c33] font-display text-lg font-black text-[#f5c518] shadow-sm sm:h-16 sm:w-16 sm:text-xl"
      >
        {initials || 'P'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-black text-[#0f1b33] sm:text-xl">{name}</p>
        {(user?.username || username) && (
          <p className="truncate text-sm text-[#64748b]">@{user?.username || username}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusPill status={user?.account_status} />
          {user?.vip_level > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-wide text-[#a16207]">
              <Crown className="h-3.5 w-3.5" />
              VIP {user.vip_level}
            </span>
          )}
          {user?.is_demo && (
            <span className="inline-flex items-center rounded-full bg-[#e0e7ff] px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-wide text-[#4338ca]">
              Demo
            </span>
          )}
        </div>
      </div>
    </T5Card>
  );
}

export default function Theme5Profile() {
  const router = useRouter();
  const { token, user, username, logout, refreshSession } = useAuthStore();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    refreshSession();
  }, [token, router, refreshSession]);

  if (!token) return null;

  // Region reads as "Maharashtra, IN" — either half may be missing.
  const region = [user?.state, user?.country_code?.toUpperCase()].filter(Boolean).join(', ');

  return (
    <T5FormPage title="Profile">
      <IdentityCard user={user} username={username} />

      <T5Card className="mt-4 p-5 sm:p-6">
        <GroupHead icon={BadgeCheck}>Account details</GroupHead>
        <Row label="Full name" value={user?.full_name} />
        <Row label="Username" value={user?.username || username} />
        <Row label="Phone" value={user?.phone} mono />
        <Row label="Player ID" value={user?.id} mono />
        <Row label="Region" value={region || DASH} />
        <Row label="Member since" value={formatDate(user?.created_at)} />
        <Row label="Last login" value={formatDateTime(user?.last_login_at)} />
      </T5Card>

      <T5Card className="mt-4 p-5 sm:p-6">
        <GroupHead icon={ShieldCheck}>Security</GroupHead>
        <Row label="Password">
          <Link
            href="/change-password"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1d4ed8] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#1d4ed8]/40"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Change
          </Link>
        </Row>
      </T5Card>

      <ReferralCard />

      <T5Card className="mt-4 p-5 sm:p-6">
        <GroupHead icon={WalletIcon}>Preferences</GroupHead>
        <Row label="Currency" value={user?.currency} />
        <Row label="Language" value={user?.website_language?.toUpperCase()} />
      </T5Card>

      {/* Logout: a real, clearly-labelled control rather than a bare text link,
          and destructive enough to confirm first — an accidental tap on mobile
          used to end the session outright. The confirm step swaps in place so
          the page never jumps. */}
      <div className="mb-2 mt-6">
        {confirmingLogout ? (
          <T5Card className="border-[#f4547a]/30 bg-[#fff5f7] p-4 sm:p-5">
            <p className="text-sm font-bold text-[#0f1b33]">Log out of your account?</p>
            <p className="mt-1 text-sm text-[#64748b]">
              You&apos;ll need to sign in again to place bets or withdraw.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg bg-[#e11d48] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_8px_20px_-10px_rgba(225,29,72,0.9)] outline-none transition hover:bg-[#be123c] focus-visible:ring-2 focus-visible:ring-[#e11d48]/40 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                Yes, log out
              </button>
              <button
                type="button"
                onClick={() => setConfirmingLogout(false)}
                className={`${t5BtnOutline} px-5 py-2.5 text-sm`}
              >
                Cancel
              </button>
            </div>
          </T5Card>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#f4547a]/40 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-[#e11d48] shadow-sm outline-none transition hover:border-[#e11d48] hover:bg-[#fff5f7] focus-visible:ring-2 focus-visible:ring-[#e11d48]/40 active:scale-[0.99] sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        )}
      </div>
    </T5FormPage>
  );
}

// --- Referrals --------------------------------------------------------------
// The player's own code, who invited them, and who they have brought in.
// Registration accepted a referral code but nothing was ever shown back, so a
// player had no way to tell whether their invites had landed.
function ReferralCard() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api('/api/v1/referral')
      .then((res) => active && setData(res))
      .catch(() => active && setData(null));
    return () => {
      active = false;
    };
  }, []);

  if (!data?.referral_code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the code is displayed to copy by hand.
    }
  };

  return (
    <T5Card className="mt-4 p-5 sm:p-6">
      <GroupHead icon={UsersIcon}>Referrals</GroupHead>

      <Row label="Your code">
        <span className="inline-flex items-center gap-2">
          <span className="font-mono text-sm font-black tracking-[0.2em] text-[#0f1b33]">
            {data.referral_code}
          </span>
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-bold text-[#1d4ed8] transition hover:border-[#1d4ed8] hover:bg-[#eff4ff]"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </Row>
      <Row label="Players referred" value={String(data.referred_count ?? 0)} />
      {data.referred_by && <Row label="Referred by" value={data.referred_by} />}

      {data.referrals?.length > 0 && (
        <div className="mt-3 border-t border-black/[0.06] pt-3">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-[#94a3b8]">
            Who joined with your code
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.referrals.map((r, i) => (
              <li key={`${r.username}-${i}`} className="flex justify-between gap-3 text-sm">
                <span className="font-mono text-[#0f1b33]">{r.username}</span>
                <span className="text-xs text-[#64748b]">{formatDate(r.joined_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </T5Card>
  );
}
