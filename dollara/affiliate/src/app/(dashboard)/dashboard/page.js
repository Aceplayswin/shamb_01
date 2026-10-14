// src/app/(dashboard)/dashboard/page.js
'use client';

import React from 'react';
import {
  MousePointerClick,
  UserPlus,
  BadgeDollarSign,
  Activity,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { useAffiliate } from '../../../context/AffiliateContext';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { CardSkeleton, DataState } from '../../../components/ui/DataState';
import StatCard from '../_components/StatCard';
import CommissionChart from '../_components/ChartPlaceholder';
import TopLinksTable from '../_components/TopLinksTable';
import ActivityFeed from '../_components/ActivityFeed';

/** `+12.4%` / `-3.1%` / `0%` from the server's delta. */
function formatTrend(trend) {
  if (!trend) return null;
  const value = Number(trend.delta_pct || 0);
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const { me, range, rangeQuery } = useAffiliate();

  // Keyed on the range so the header's date picker actually re-queries. It used
  // to be local state inside the header and reached nothing.
  const { data, loading, error, reload } = useAffiliateData(
    `/api/v1/affiliate/dashboard?${rangeQuery}`,
    [range.from, range.to],
  );

  const stats = data?.stats;
  const trends = data?.trends ?? {};
  const firstName = (me?.name || '').split(' ')[0];

  const cards = [
    { key: 'clicks', title: 'Total Clicks', icon: MousePointerClick },
    { key: 'signups', title: 'Signups', icon: UserPlus },
    { key: 'ftds', title: 'First Deposits (FTDs)', icon: BadgeDollarSign },
    { key: 'active_players', title: 'Active Players', icon: Activity },
    { key: 'commission', title: 'Commission (This Period)', icon: TrendingUp, isCurrency: true },
    { key: 'pending_payout', title: 'Pending Payout', icon: Wallet, isCurrency: true },
  ];

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Welcome Banner ── */}

      <div className="glass p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back{firstName ? `, ${firstName}` : ''}! 👋
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here is the performance report for your attributed campaigns.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Accruals Active
          </span>

          {/* The affiliate's actual terms, not a fixed 45%. */}
          {me && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-400/20 dark:border-brand-500/30">
              {me.commission_type === 'cpa'
                ? `CPA: ₹${me.cpa_amount}`
                : `Rev Share: ${me.commission_rate}%`}
            </span>
          )}
        </div>
      </div>

      {/* ── 6 Stat Cards Grid ── */}

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        skeleton={<CardSkeleton count={6} />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(({ key, title, icon, isCurrency }) => (
            <StatCard
              key={key}
              title={title}
              value={stats?.[key] ?? 0}
              icon={icon}
              // Real period-over-period movement, replacing six fixed strings
              // that never changed regardless of the data.
              trend={formatTrend(trends[key])}
              isCurrency={isCurrency}
            />
          ))}
        </div>
      </DataState>

      {/* ── Visual Charts Section ── */}
      <CommissionChart funnel={data?.funnel} />

      {/* ── Details & Activities Layout ── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Top Performing Links Table (7 columns block) */}
        <div className="lg:col-span-7">
          <TopLinksTable />
        </div>

        {/* Right: Activity Feed (5 columns block) */}
        <div className="lg:col-span-5">
          <ActivityFeed />
        </div>
      </div>

    </div>
  );
}
