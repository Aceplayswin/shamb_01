'use client';

import {
  Users,
  UserPlus,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Wallet,
} from 'lucide-react';
import {
  AdminShell,
  Card,
  StatCard,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';
import TrendsChart from '@/components/admin/TrendsChart';
import DashboardTables from '@/components/admin/DashboardTables';

export default function AdminDashboardPage() {
  const { data: stats, loading } = useAdminData('/api/v1/admin/dashboard');
  const { data: charts } = useAdminData('/api/v1/admin/dashboard/charts');
  const { data: tables } = useAdminData('/api/v1/admin/dashboard/tables');

  const cards = stats
    ? [
        { label: 'Today Active Player', value: stats.activePlayers ?? 0, icon: Activity, accent: 'brand' },
        { label: 'Last Hour Active Players', value: stats.activePlayersLastHour ?? 0, icon: Clock, accent: 'rose' },
        { label: 'Today: New Players', value: stats.signupsToday ?? 0, icon: UserPlus, accent: 'emerald', hint: `Yesterday: ${stats.signupsYesterday ?? 0}` },
        { label: 'Player Count', value: stats.totalUsers ?? 0, icon: Users, accent: 'sky', hint: `Total Player Deposits: ${stats.depositingPlayers ?? 0}` },
        { label: 'Total Balance', value: inr(stats.totalLiability), icon: Wallet, accent: 'indigo' },
        { label: 'Today: Sum of Deposits', value: inr(stats.depositsToday.amount), icon: ArrowDownToLine, accent: 'emerald', hint: `Player Deposits: ${stats.depositsToday.players ?? 0} · Deposit Count: ${stats.depositsToday.count ?? 0}` },
        { label: 'Today: Sum of Withdrawals', value: inr(stats.withdrawalsToday.amount), icon: ArrowUpFromLine, accent: 'rose', hint: `Player Withdrawals: ${stats.withdrawalsToday.players ?? 0} · Withdrawals Count: ${stats.withdrawalsToday.count ?? 0}` },
      ]
    : [];

  return (
    <AdminShell title="Dashboard" subtitle="Real-time overview of your platform">
      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[7.5rem] animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      )}

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold text-white">Trends Graph For Last 7 Days</h2>
        {charts ? (
          <div className="mt-4">
            <TrendsChart data={charts.series} />
          </div>
        ) : (
          <div className="mt-4 h-[26rem] animate-pulse rounded-lg bg-slate-800/60" />
        )}
      </Card>

      <DashboardTables data={tables} />
    </AdminShell>
  );
}
