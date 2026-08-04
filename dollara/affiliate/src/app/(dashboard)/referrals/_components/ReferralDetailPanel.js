'use client';

import { X, DollarSign, TrendingUp, Banknote, CalendarDays, UserPlus, ShieldCheck, ArrowDown, Gamepad2 } from 'lucide-react';
import { mockPlayerActivity } from '../../../../lib/mockData';




const MONTH_LABELS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];



const STATUS_DOT = {
  active:  'bg-emerald-500',
  dormant: 'bg-amber-500',
  blocked: 'bg-red-500',
};




const ACTIVITY_ICONS = {
  'user-plus':    UserPlus,
  'shield-check': ShieldCheck,
  'banknote':     Banknote,
  'arrow-down':   ArrowDown,
  'gamepad-2':    Gamepad2,
};



export default function ReferralDetailPanel({ player, onClose }) {
  if (!player) return null;


  const maxDep = Math.max(...player.monthlyDeposits, 1);
  const daysActive = Math.round((new Date(player.lastActive) - new Date(player.signupDate)) / (1000 * 60 * 60 * 24));




  const statCards = [

    
    { label: 'Lifetime Deposits', value: `$${player.lifetimeDeposits.toLocaleString()}`, icon: DollarSign, accent: 'text-brand-600 dark:text-brand-400' },
    { label: 'Commission Earned', value: `$${player.commission.toLocaleString()}`,       icon: TrendingUp,  accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'First Deposit',     value: player.ftdAmount > 0 ? `$${player.ftdAmount}` : '—', icon: Banknote, accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Days Active',       value: daysActive,                                      icon: CalendarDays, accent: 'text-violet-600 dark:text-violet-400' },
  ];





  const timeline = [];
  timeline.push({ icon: 'user-plus', text: `Signed up on ${player.signupDate}`, date: player.signupDate });
  if (player.kyc !== 'Pending') {
    timeline.push({ icon: 'shield-check', text: `KYC ${player.kyc.toLowerCase()}`, date: player.signupDate });
  }
  if (player.ftdDate) {
    timeline.push({ icon: 'banknote', text: `First deposit of $${player.ftdAmount}`, date: player.ftdDate });
  }
  if (player.lifetimeDeposits > player.ftdAmount) {
    timeline.push({ icon: 'arrow-down', text: `$${(player.lifetimeDeposits - player.ftdAmount).toLocaleString()} in subsequent deposits`, date: player.lastActive });
  }
  if (player.status === 'active') {
    timeline.push({ icon: 'gamepad-2', text: 'Player is currently active', date: player.lastActive });
  }



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
              {player.id.slice(0, 2)}
            </div>
            
            <div>
            
              <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">Player #{player.id}</h2>
              
              <div className="flex items-center gap-2 mt-0.5">
              
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[player.status]}`} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{player.status}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">· {player.country}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">· via {player.source}</span>
              
              
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
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
              {player.monthlyDeposits.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{val > 0 ? `$${val}` : ''}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500"
                    style={{ height: `${Math.max((val / maxDep) * 100, 4)}%`, minHeight: val > 0 ? '8px' : '4px', opacity: val > 0 ? 1 : 0.2 }}
                  />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">{MONTH_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 p-4 transition-colors duration-300">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Activity Timeline</h3>
            <div className="space-y-0">
              {timeline.map((event, i) => {
                const Icon = ACTIVITY_ICONS[event.icon] || UserPlus;
                return (
                  <div key={i} className="flex gap-3 relative">
                    {/* Vertical line */}
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[13px] top-7 w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="w-7 h-7 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center shrink-0 z-10">
                      <Icon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{event.text}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{event.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy note */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">🔒 Privacy</span> — Aggregated stats only. No raw PII displayed.
            </p>
          </div>
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
