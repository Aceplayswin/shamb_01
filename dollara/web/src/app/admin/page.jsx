'use client';

import Link from 'next/link';
import {
  Users,
  UserPlus,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AdminShell,
  BarChart,
  ChartLegend,
  Card,
  StatCard,
  StatusBadge,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const SERIES = [
  { key: 'deposits', label: 'Deposits', color: 'bg-gradient-to-t from-brand-600 to-brand-400' },
  { key: 'withdrawals', label: 'Withdrawals', color: 'bg-gradient-to-t from-brand-600 to-brand-400' },
];

export default function AdminDashboardPage() {
  const { data: stats, loading } = useAdminData('/api/v1/admin/dashboard');
  const { data: charts } = useAdminData('/api/v1/admin/dashboard/charts');
  const { data: activity } = useAdminData('/api/v1/admin/activity');

  const cards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, accent: 'brand' },
        { label: 'Active Players', value: stats.activePlayers, icon: Activity, accent: 'emerald', hint: 'Last 15 min' },
        { label: 'Signups Today', value: stats.signupsToday, icon: UserPlus, accent: 'sky' },
        { label: 'Total Liability', value: inr(stats.totalLiability), icon: Wallet, accent: 'sky', hint: 'Player balances' },
        { label: 'Deposits Today', value: inr(stats.depositsToday.amount), icon: ArrowDownToLine, accent: 'emerald', hint: `${stats.depositsToday.count} transactions` },
        { label: 'Withdrawals Today', value: inr(stats.withdrawalsToday.amount), icon: ArrowUpFromLine, accent: 'rose', hint: `${stats.withdrawalsToday.count} transactions` },
      ]
    : [];

  const queue = charts
    ? [
        { label: 'Pending withdrawals', value: charts.pendingWithdrawals, href: '/admin/withdrawals', icon: ArrowUpFromLine },
        { label: 'Pending deposits', value: charts.pendingDeposits, href: '/admin/deposits', icon: ArrowDownToLine },
        { label: 'KYC pending', value: charts.kycPending, href: '/admin/users', icon: Clock },
      ]
    : [];

  return (
    <AdminShell title="Dashboard" subtitle="Real-time overview of your platform">
      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Cash flow</h2>
              <p className="text-xs text-slate-500">Last 7 days</p>
            </div>
            <ChartLegend series={SERIES} />
          </div>
          {charts ? (
            <BarChart data={charts.series} series={SERIES} />
          ) : (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.04]" />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-bold text-white">Action queue</h2>
          <p className="text-xs text-slate-500">Items needing attention</p>
          <div className="mt-4 space-y-2.5">
            {queue.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-950/40 p-3 transition hover:border-brand-400/30 hover:bg-white/[0.03]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-800 text-brand-400">
                  <q.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium text-slate-300">{q.label}</span>
                <span className="font-display text-lg font-bold text-white">{q.value ?? 0}</span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h2 className="font-display text-lg font-bold text-white">Recent activity</h2>
            <Link href="/admin/transactions" className="text-xs font-semibold text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {(activity ?? []).slice(0, 8).map((a) => {
              const isOut = a.type === 'withdrawal';
              return (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-lg ${
                      isOut ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {isOut ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {a.full_name || a.username}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {a.type.replace(/_/g, ' ')} · {fmtDate(a.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-white">{inr(a.amount)}</span>
                  <StatusBadge status={a.status} />
                </div>
              );
            })}
            {activity && activity.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-slate-500">No activity yet</p>
            )}
            {!activity && (
              <div className="space-y-px p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-bold text-white">Bets by category</h2>
          <p className="text-xs text-slate-500">All-time volume</p>
          <div className="mt-4 space-y-3">
            {charts?.categories?.length ? (
              charts.categories.slice(0, 6).map((c) => {
                const maxVol = Math.max(...charts.categories.map((x) => x.volume), 1);
                return (
                  <div key={c.category}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize text-slate-300">
                        {c.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500">{inr(c.volume)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
                        style={{ width: `${(c.volume / maxVol) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No bets recorded yet</p>
            )}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
