// src/app/(dashboard)/_components/StatCard.js
'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';




export default function StatCard({ title, value, icon: Icon, trend, isCurrency = false }) {


  const isPositive = trend && !trend.startsWith('-');
  const isZero = trend === '0%' || !trend;




  return (
    <div className="glass p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
    
      <div className="flex items-start justify-between">

        <div className="space-y-1">

          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">

            {title}

          </span>

          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-display">

            {isCurrency ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString()}

          </span>


        </div>

        <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 text-brand-700 dark:text-brand-400 flex items-center justify-center shrink-0">
       
          <Icon className="w-5 h-5" />

        </div>

      </div>


      {trend && (

        <div className="mt-4 flex items-center space-x-1.5 text-xs">

          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
            isZero 

              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' 

              : isPositive 

                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
          }`
          }
          >


            {isZero ? null : isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            )}
            {trend}
          </span>


          <span className="text-slate-400 dark:text-slate-500">vs last period</span>
        </div>

      )}


    </div>


  );
}
