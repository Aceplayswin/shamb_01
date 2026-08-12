// src/app/(dashboard)/_components/ChartPlaceholder.js
'use client';

import React from 'react';
import { BarChart, Percent, HelpCircle } from 'lucide-react';
import { useAffiliate } from '../../../context/AffiliateContext';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { DataState } from '../../../components/ui/DataState';
import { inr, num } from '../../../lib/format';

/**
 * Commission trend + conversion funnel.
 *
 * The bars are plain divs rather than a charting library, which is fine — but
 * they scale against a ceiling, and that ceiling used to be the literal 1100.
 * Any real day above it simply overflowed the container. The server now returns
 * `max` alongside the points so the axis fits whatever the data actually is.
 *
 * `funnel` is passed down from the dashboard, which already has it, rather than
 * fetched again here.
 */
export default function CommissionChart({ funnel }) {
  const { range, rangeQuery } = useAffiliate();
  const { data, loading, error, reload } = useAffiliateData(
    `/api/v1/affiliate/dashboard/chart?${rangeQuery}&metric=commission`,
    [range.from, range.to],
  );

  const points = data?.points ?? [];
  const max = data?.max || 100;
  const steps = funnel ?? [];

  return (
    <div className="grid lg:grid-cols-12 gap-6">

      {/* ── CHART 1: COMMISSION TREND ── */}
      <div className="lg:col-span-7 glass p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-brand-600" />
              <span>Commission Trend</span>
            </h3>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Earnings per day across the selected range
            </p>
          </div>

          <span className="px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-400 text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Live
          </span>
        </div>

        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!points.length}
          emptyTitle="No commission in this range"
          emptyHint="Bars appear here once your referred players start generating revenue."
          emptyIcon={BarChart}
          skeleton={
            <div className="min-h-[200px] flex-1 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          }
        >
          <div className="flex-1 flex items-end justify-between gap-3 sm:gap-6 min-h-[200px] px-2 pt-6">
            {points.map((item) => {
              const pctHeight = max > 0 ? (item.value / max) * 100 : 0;

              return (
                <div key={item.date} className="flex-1 flex flex-col items-center group relative">

                  {/* Hover Tooltip */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform duration-200 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded shadow-md border dark:border-slate-700 z-10 whitespace-nowrap">
                    {inr(item.value)}
                  </div>

                  {/* CSS Flex Bar */}
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-400/80 to-brand-500 hover:from-brand-300 hover:to-brand-400 transition-all duration-300 cursor-pointer shadow-sm shadow-slate-100 dark:shadow-none"
                    // A zero-value day still shows a sliver, so the axis reads as
                    // "nothing here" rather than "no bar rendered".
                    style={{ height: `${pctHeight}%`, minHeight: '4%' }}
                  />

                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2.5 uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </DataState>
      </div>

      {/* ── CHART 2: CONVERSION FUNNEL ── */}
      <div className="lg:col-span-5 glass p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-sky-600" />
              <span>Conversion Funnel</span>
            </h3>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Clicks through to first deposits
            </p>
          </div>

          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full tracking-wider">
            Attribution
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4">
          {steps.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-400">
              No traffic recorded in this range yet.
            </p>
          )}

          {steps.map((step, idx) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  {step.label}
                </span>

                <span className="text-slate-800 dark:text-slate-200 font-display">
                  {num(step.value)}{' '}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({step.pct}%)
                  </span>
                </span>
              </div>

              {/* Horizontal Progress Bar */}
              <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/20 dark:border-slate-800/10">
                <div
                  className={`h-full rounded-lg transition-all duration-500 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-sky-400 to-sky-500'
                      : idx === 1
                        ? 'bg-gradient-to-r from-brand-400 to-brand-500'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(step.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Informative Footer */}
        <div className="mt-4 p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 leading-relaxed flex items-start gap-1.5 rounded-lg text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
          <span>
            Percentages are measured against clicks in the selected range. Use
            Reports to break the same figures down by link, sub-affiliate or country.
          </span>
        </div>
      </div>

    </div>
  );
}
