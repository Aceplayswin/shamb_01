// src/app/(dashboard)/_components/ActivityFeed.js



'use client';

import React from 'react';
import { mockActivity } from '../../../lib/mockData';

import { UserPlus, Wallet, CreditCard, Activity } from 'lucide-react';
import styles from './ActivityFeed.module.css';






export default function ActivityFeed() {
  return (
    <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col h-full transition-colors duration-300">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-600" />
          <span>Recent Activity</span>
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time status updates of referred events</p>
      </div>







      <div className={`${styles.niceScroll} flex-1 overflow-y-auto max-h-[350px] p-5 divide-y divide-slate-100 dark:divide-slate-800`}>
        {mockActivity.map((event, idx) => {
          let Icon = UserPlus;
          let badgeClass = 'bg-gradient-to-tr from-sky-400 to-blue-600 text-white';

          if (event.type === 'deposit') {
            Icon = CreditCard;
            badgeClass = 'bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white';
          } else if (event.type === 'payout') {
            Icon = Wallet;
            badgeClass = 'bg-gradient-to-tr from-amber-400 to-amber-600 text-white';
          }




          return (
            <div key={idx} className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0 gap-3">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${badgeClass} shadow-md ring-1 ring-white/10 ${idx === 0 ? 'animate-pulse' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>


                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    {event.text}
                  </p>


                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                    {event.time}
                  </span>


                </div>
              </div>

            </div>
         
        );
        }
        )
        }
      
      </div>
  
    </div>
  );
}
