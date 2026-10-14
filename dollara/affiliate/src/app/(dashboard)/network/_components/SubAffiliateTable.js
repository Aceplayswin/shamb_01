'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, UserPlus, Calendar } from 'lucide-react';
import { fmtDateShort, inr, num } from '../../../../lib/format';

const STATUS_DOT = {
  approved: 'bg-emerald-500',
  pending: 'bg-amber-500',
  info_requested: 'bg-amber-500',
  rejected: 'bg-red-500',
  suspended: 'bg-red-500',
  active:  'bg-emerald-500',
  dormant: 'bg-amber-500',
};



export default function SubAffiliateTable({ items }) {
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };



  return (
   
   
   <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden transition-colors duration-300">
     
      <div className="overflow-x-auto">
      
        <table className="w-full text-left border-collapse text-xs">
          
          <thead>
           
            <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
             
              <th className="p-4 w-10"></th>
              <th className="p-4">Sub-Affiliate</th>
              <th className="p-4">Joined Date</th>
              <th className="p-4">Recruits (Regs/FTDs)</th>
              <th className="p-4">Sub-Commission</th>
              <th className="p-4">Override Rate</th>
              <th className="p-4">Override Earned</th>
              <th className="p-4">Status</th>



            </tr>


          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((sub) => {
              const isExpanded = !!expandedIds[sub.id];
              const hasChildren = sub.children && sub.children.length > 0;
              return (
                // Fragment.key, not a key on the inner <tr>: a bare <> cannot
                // carry one, so this list was effectively unkeyed and React
                // re-created every row on each render.
                <Fragment key={sub.id}>

                  {/* Primary Row */}

                  <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      {hasChildren ? (
                        <button
                          onClick={() => toggleExpand(sub.id)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : null}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                      {sub.name}
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{sub.code}</span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{fmtDateShort(sub.joined_at)}</td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.signups}
                        
                         Regs
                         
                         </span>

                      <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>

                      <span className="font-bold text-brand-600 dark:text-brand-400">{sub.ftds}

                         FTDs
                         
                         </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">{num(sub.clicks)} 
                        clicks
                        
                        </span>
                        
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{inr(sub.sub_commission)}</td>
                    <td className="p-4 font-semibold text-slate-500 dark:text-slate-400">{sub.override_rate}%</td>
                    <td className="p-4 font-extrabold text-emerald-600 dark:text-emerald-400 font-display">


                      +{inr(sub.override_earned)}
                    </td>


                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[sub.status]}`} />

                        {sub.status}

                      </span>
                    </td>


                  </tr>




                  {/* Expansion (Children Network Tiers) */}
                  {hasChildren && isExpanded && (
                   
                   <tr className="bg-slate-50/50 dark:bg-slate-950/20">

                      <td className="p-0" colSpan={8}>

                        <div className="pl-14 pr-4 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800">
                        
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                           
                            <UserPlus className="w-3.5 h-3.5" />
                            Recruitment Channels & Sub-agents
                          </p>

                          <div className="grid sm:grid-cols-2 gap-3 pb-1">
                            {sub.children.map((c) => (
                              <div key={c.id} className="p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    
                                    {c.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3" /> Joined {fmtDateShort(c.joined_at)}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                  {num(c.recruits)} referred
                                </span>
                              </div>
                            ))}
                          </div>

                        </div>

                      </td>

                    </tr>


                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
