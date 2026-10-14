'use client';

import { Users, GitCommit, Percent, TrendingUp } from 'lucide-react';
import { inr, num } from '../../../../lib/format';

/**
 * Network totals.
 *
 * All four figures are computed server-side. "Average Tier Rate" in particular
 * used to be the literal string '4.8%', so it read as a real statistic while
 * being identical for every partner regardless of their actual override rates.
 */
export default function OverrideSummary({ summary, loading }) {
  const cards = [
    {
      label: 'Sub-Affiliates',
      value: num(summary?.sub_count ?? 0),
      icon: Users,
      accent: 'text-brand-600 dark:text-brand-400',
    },
    {
      label: 'Network Signups',
      value: num(summary?.network_signups ?? 0),
      icon: GitCommit,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Total Overrides',
      value: inr(summary?.total_override_earned ?? 0),
      icon: TrendingUp,
      accent: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Average Override Rate',
      value: `${summary?.average_override_rate ?? 0}%`,
      icon: Percent,
      accent: 'text-violet-600 dark:text-violet-400',
    },
  ];

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[86px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, accent }) => (
        <div
          key={label}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 transition-colors duration-300 hover:scale-[1.01]"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className={`w-4 h-4 ${accent}`} />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {label}
            </span>
          </div>
          <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
