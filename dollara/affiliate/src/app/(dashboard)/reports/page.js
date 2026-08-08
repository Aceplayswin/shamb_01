'use client';

import { useMemo, useState } from 'react';
import { Download, BarChart3, Globe2, Link2, Users } from 'lucide-react';
import { mockReferrals, mockSubAffiliates, mockTopLinks } from '../../../lib/mockData';


// quick helper for the preset buttons
function preset(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

function formatDate(value) {
  if (!value) return 'All time';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// check if a date sits inside the selected range
function inDateRange(value, from, to) {
  if (!value) return true;
  const date = new Date(value);
  if (from && date < new Date(from)) return false;
  if (to && date > new Date(to)) return false;
  return true;
}

function makeCsvLine(values) {
  return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
}


export default function ReportsPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [breakdown, setBreakdown] = useState('link');
  const [busy, setBusy] = useState(false);


  const filteredLinks = useMemo(
    () => mockTopLinks.filter((item) => inDateRange(item.created, range.from, range.to)),
    [range],
  );

  const filteredSubAffiliates = useMemo(
    () => mockSubAffiliates.filter((item) => inDateRange(item.joinedDate, range.from, range.to)),
    [range],
  );

  const filteredReferrals = useMemo(
    () => mockReferrals.filter((item) => inDateRange(item.signupDate, range.from, range.to)),
    [range],
  );


  // group referrals by country
  const countryBreakdown = useMemo(() => {
    const map = new Map();

    filteredReferrals.forEach((referral) => {
      const current = map.get(referral.country) ?? {
        country: referral.country,
        referrals: 0,
        signups: 0,
        ftds: 0,
        commission: 0,
      };

      current.referrals += 1;
      current.signups += referral.signups ? 1 : 0;
      current.ftds += referral.ftdAmount ? 1 : 0;
      current.commission += referral.commission;

      map.set(referral.country, current);
    });

    return Array.from(map.values()).sort((a, b) => b.commission - a.commission);
  }, [filteredReferrals]);


  // totals for the cards at the top
  const summary = useMemo(() => {
    if (breakdown === 'link') {
      return {
        primary: 'Link performance',
        totalA: filteredLinks.reduce((sum, item) => sum + item.clicks, 0),
        totalB: filteredLinks.reduce((sum, item) => sum + item.signups, 0),
        totalC: filteredLinks.reduce((sum, item) => sum + item.ftds, 0),
        totalD: filteredLinks.reduce((sum, item) => sum + item.commission, 0),
      };
    }

    if (breakdown === 'subAffiliate') {
      return {
        primary: 'Sub-affiliate network',
        totalA: filteredSubAffiliates.reduce((sum, item) => sum + item.clicks, 0),
        totalB: filteredSubAffiliates.reduce((sum, item) => sum + item.signups, 0),
        totalC: filteredSubAffiliates.reduce((sum, item) => sum + item.ftds, 0),
        totalD: filteredSubAffiliates.reduce((sum, item) => sum + item.subCommission, 0),
      };
    }

    // country view
    return {
      primary: 'Country performance',
      totalA: countryBreakdown.reduce((sum, item) => sum + item.referrals, 0),
      totalB: countryBreakdown.reduce((sum, item) => sum + item.signups, 0),
      totalC: countryBreakdown.reduce((sum, item) => sum + item.ftds, 0),
      totalD: countryBreakdown.reduce((sum, item) => sum + item.commission, 0),
    };
  }, [breakdown, filteredLinks, filteredSubAffiliates, countryBreakdown]);


  // rows that go into the table
  const rows = useMemo(() => {
    if (breakdown === 'link') {
      return filteredLinks.map((item) => ({
        label: item.name,
        primary: item.clicks,
        secondary: item.signups,
        tertiary: item.ftds,
        extra: `$${item.commission.toLocaleString()}`,
      }));
    }

    if (breakdown === 'subAffiliate') {
      return filteredSubAffiliates.map((item) => ({
        label: item.name,
        primary: item.clicks,
        secondary: item.signups,
        tertiary: item.ftds,
        extra: `$${item.subCommission.toLocaleString()}`,
      }));
    }

    return countryBreakdown.map((item) => ({
      label: item.country,
      primary: item.referrals,
      secondary: item.signups,
      tertiary: item.ftds,
      extra: `$${item.commission.toLocaleString()}`,
    }));
  }, [breakdown, filteredLinks, filteredSubAffiliates, countryBreakdown]);


  const handleExport = () => {
    setBusy(true);

    try {
      const headerLabels = [
        'Name',
        breakdown === 'country' ? 'Referrals' : 'Clicks',
        'Signups',
        'FTDs',
        'Commission',
      ];

      const csvRows = [makeCsvLine(headerLabels)];

      rows.forEach((row) => {
        csvRows.push(
          makeCsvLine([row.label, row.primary, row.secondary, row.tertiary, row.extra])
        );
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `affiliate-reports-${breakdown}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Export performance breakdowns by link, sub-affiliate, or country.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
            busy
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-400 to-brand-600 text-black hover:shadow-md hover:brightness-105'
          }`}
        >
          <Download className="w-4 h-4" />
          {busy ? 'Exporting…' : 'Download CSV'}
        </button>
      </div>


      {/* filters */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">

        {/* date range card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Date range
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              From
              <input
                type="date"
                value={range.from}
                onChange={(event) => setRange({ ...range, from: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              To
              <input
                type="date"
                value={range.to}
                onChange={(event) => setRange({ ...range, to: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
          </div>

          {/* quick presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['Last 7 days', 7],
              ['Last 30 days', 30],
              ['Last 90 days', 90],
            ].map(([label, days]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const [from, to] = preset(days);
                  setRange({ from, to });
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900 transition-all"
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setRange({ from: '', to: '' })}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/70 transition-all"
            >
              All time
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {range.from || range.to
              ? `${formatDate(range.from)} → ${formatDate(range.to)}`
              : 'Showing all available history for the selected breakdown.'}
          </p>
        </div>


        {/* breakdown picker */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Breakdown
          </h2>

          <div className="mt-4 grid gap-2">
            {[
              { id: 'link', label: 'By link', icon: Link2 },
              { id: 'subAffiliate', label: 'By sub-affiliate', icon: Users },
              { id: 'country', label: 'By country', icon: Globe2 },
            ].map((option) => {
              const active = breakdown === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBreakdown(option.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                    active
                      ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  <div>
                    <div>{option.label}</div>
                    <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {option.id === 'link' && 'Track campaign performance by each link.'}
                      {option.id === 'subAffiliate' && 'Compare sub-affiliates across your network.'}
                      {option.id === 'country' && 'See geography-based conversions and earnings.'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* summary cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {summary.primary}
          </p>
          <p className="mt-3 text-3xl font-black font-display text-slate-900 dark:text-slate-100">
            {breakdown === 'country'
              ? `${summary.totalA} regions`
              : `${summary.totalA.toLocaleString()}`}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {breakdown === 'country'
              ? 'Active regions in the selected time window.'
              : 'Total performance volume.'}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Signups
          </p>
          <p className="mt-3 text-3xl font-black font-display text-slate-900 dark:text-slate-100">
            {summary.totalB.toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            FTDs
          </p>
          <p className="mt-3 text-3xl font-black font-display text-slate-900 dark:text-slate-100">
            {summary.totalC.toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Revenue
          </p>
          <p className="mt-3 text-3xl font-black font-display text-slate-900 dark:text-slate-100">
            ${summary.totalD.toLocaleString()}
          </p>
        </div>
      </div>


      {/* main table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">
              {breakdown === 'link'
                ? 'Link performance'
                : breakdown === 'subAffiliate'
                ? 'Sub-affiliate network'
                : 'Country breakdown'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {breakdown === 'link'
                ? 'Detailed metrics for each affiliate tracking link.'
                : breakdown === 'subAffiliate'
                ? 'Network performance of your downstream sub-affiliates.'
                : 'Conversion distribution across countries.'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-950/80 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <BarChart3 className="w-4 h-4" />
            Updated from mock system data
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{breakdown === 'country' ? 'Country' : 'Name'}</th>
                <th className="p-4">{breakdown === 'country' ? 'Referrals' : 'Clicks'}</th>
                <th className="p-4">Signups</th>
                <th className="p-4">FTDs</th>
                <th className="p-4">Revenue</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.label}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                      {row.label}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {row.primary.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {row.secondary.toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {row.tertiary.toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                      {row.extra}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    No data matches the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}