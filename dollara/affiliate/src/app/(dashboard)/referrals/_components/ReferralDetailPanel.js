'use client';

import { X, DollarSign, TrendingUp, Banknote, CalendarDays, UserPlus, ShieldCheck, ArrowDown, Gamepad2, Loader2 } from 'lucide-react';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';
import { DataState } from '../../../../components/ui/DataState';
import { fmtDateShort, inr, relativeTime } from '../../../../lib/format';

const STATUS_DOT = {
  active:  'bg-emerald-500',
  dormant: 'bg-amber-500',
  blocked: 'bg-red-500',
};




// Maps the API's activity `type` onto an icon.
const ACTIVITY_ICONS = {
  signup:     UserPlus,
  kyc:        ShieldCheck,
  deposit:    Banknote,
  commission: ArrowDown,
  active:     Gamepad2,
};



export default function ReferralDetailPanel({ referralId, onClose }) {
  // Fetched on open rather than passed down: the panel shows a monthly chart
  // and a timeline that the list endpoint has no reason to carry for every row.
  const { data, loading, error, reload } = useAffiliateData(
    referralId ? `/api/v1/affiliate/referrals/${referralId}` : null,
    [referralId],
  );

  const player = data?.referral;
  const monthly = data?.monthly_deposits ?? { labels: [], values: [] };
  const activity = data?.activity ?? [];

  const maxDep = Math.max(...(monthly.values.length ? monthly.values : [0]), 1);

  const daysActive = player?.last_active_at && player?.signed_up_at
    ? Math.max(
        Math.round(
          (new Date(player.last_active_at) - new Date(player.signed_up_at))
          / (1000 * 60 * 60 * 24),
        ),
        0,
      )
    : 0;

  const statCards = player
    ? [
        { label: 'Lifetime Deposits', value: inr(player.lifetime_deposits), icon: DollarSign, accent: 'text-brand-600 dark:text-brand-400' },
        { label: 'Commission Earned', value: inr(player.lifetime_commission), icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'First Deposit', value: player.ftd_amount > 0 ? inr(player.ftd_amount) : '—', icon: Banknote, accent: 'text-sky-600 dark:text-sky-400' },
        { label: 'Days Active', value: daysActive, icon: CalendarDays, accent: 'text-violet-600 dark:text-violet-400' },
      ]
    : [];

  return (
   
   
   <div className="fixed inset-0 z-50 flex justify-end">
     
     
       {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />


      {/* Panel — starts from top, has its own scroll */}
      <div className="relative w-full max-w-md h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-slide-in-right">
        
        {/* Header */}
        <div className="shrink-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 p-5 flex items-center justify-between">
         
          <div className="flex items-center gap-3">
           
           
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-black font-black text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'P'}
            </div>

            <div>
              <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">
                {player ? player.player_ref : 'Loading…'}
              </h2>

              {player && (
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[player.status]}`} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {player.status}
                  </span>
                  {player.country_code && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">· {player.country_code}</span>
                  )}
                  {player.source_link_name && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      · via {player.source_link_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <DataState loading={loading} error={error} onRetry={reload}>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 p-3.5 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${accent}`} />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
                <span className="text-lg font-black font-display text-slate-900 dark:text-slate-100">{value}</span>
              </div>
            ))}
          </div>

          {/* Monthly deposit chart */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 p-4 transition-colors duration-300">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Monthly Deposits</h3>
            <div className="flex items-end gap-2 h-28">
              {monthly.values.map((val, i) => (
                <div key={monthly.labels[i] ?? i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    {val > 0 ? inr(val) : ''}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500"
                    style={{
                      height: `${Math.max((val / maxDep) * 100, 4)}%`,
                      minHeight: val > 0 ? '8px' : '4px',
                      opacity: val > 0 ? 1 : 0.2,
                    }}
                  />
                  {/* Month names come from the server, which knows what the last
                      six months actually were — these used to be hardcoded to
                      Mar–Aug and were wrong for most of the year. */}
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {monthly.labels[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 p-4 transition-colors duration-300">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Activity Timeline</h3>
            <div className="space-y-0">
              {activity.length === 0 && (
                <p className="py-2 text-xs text-slate-400">Nothing recorded yet.</p>
              )}
              {activity.map((event, i) => {
                const Icon = ACTIVITY_ICONS[event.type] || UserPlus;
                return (
                  <div key={`${event.type}-${event.at}-${i}`} className="flex gap-3 relative">
                    {/* Vertical line */}
                    {i < activity.length - 1 && (
                      <div className="absolute left-[13px] top-7 w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center shrink-0 z-10">
                      <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{event.text}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {fmtDateShort(event.at)} · {relativeTime(event.at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy note */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">🔒 Privacy</span> — Aggregated stats only. No player contact details are shared.
            </p>
          </div>
          </DataState>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
