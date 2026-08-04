'use client';

import { Users, GitCommit, Percent, TrendingUp } from 'lucide-react';

export default function OverrideSummary({ items }) {
  const totalNetworkSize = items.length;
  const totalSubFTDs = items.reduce((sum, i) => sum + i.ftds, 0);
  const totalOverrideEarned = items.reduce((sum, i) => sum + i.overrideEarned, 0);




  const cards = [
    { label: 'Sub-Affiliates',    value: totalNetworkSize,                       icon: Users,     accent: 'text-brand-600 dark:text-brand-400' },
    { label: 'Sub-Affiliate FTDs', value: totalSubFTDs,                          icon: GitCommit, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Overrides',   value: `$${totalOverrideEarned.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: TrendingUp,  accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Average Tier Rate', value: '4.8%',                                 icon: Percent,   accent: 'text-violet-600 dark:text-violet-400' },
  ];




  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">


      {cards.map(({ label, value, icon: Icon, accent }) => (
        <div key={label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 transition-colors duration-300 hover:scale-[1.01]">
      
      
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
      )
      )
      }
   
    </div>
  );
}
