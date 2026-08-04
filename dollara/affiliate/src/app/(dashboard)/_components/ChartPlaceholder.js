// src/app/(dashboard)/_components/ChartPlaceholder.js
'use client';

import React from 'react';
import { mockCommissionChart, mockFunnel } from '../../../lib/mockData';
import { BarChart, Percent, HelpCircle } from 'lucide-react';

export default function ChartPlaceholder() {
  return (
    <div className="grid lg:grid-cols-12 gap-6">


      
      {/* ── CHART 1: WEEKLY COMMISSION OVERVIEW ── */}
      <div className="lg:col-span-7 glass p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-brand-600" />
            
              <span>Weekly Commission Trend</span>

            </h3>
           
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Earnings distribution across the last 7 days</p>

          </div>
          <span className="px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-450 text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
           
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Phase 1 Mock
          </span>

        </div>



        {/* Visual mock chart with pure CSS flex bars */}


        <div className="flex-1 flex items-end justify-between gap-3 sm:gap-6 min-h-[200px] px-2 pt-6">
          {mockCommissionChart.map((item, idx) => {

            
            // Find max to scale height proportionally (max is 1100)


            const maxVal = 1100;
            const pctHeight = (item.amount / maxVal) * 100;



            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">


                
                {/* Hover Tooltip */}

                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform duration-200 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded shadow-md border dark:border-slate-700 z-10 whitespace-nowrap">


                  ${item.amount}

                </div>

                {/* CSS Flex Bar */}


                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-brand-400/80 to-brand-500 hover:from-brand-300 hover:to-brand-400 transition-all duration-300 cursor-pointer shadow-sm shadow-slate-100 dark:shadow-none"
                  style={{ height: `${pctHeight}%`, minHeight: '15%' }}
                />


                
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2.5 uppercase tracking-wider">


                  {item.day}


                </span>
              </div>


            );
          
          }
        )
          }


        </div>

      </div>




      {/* ── CHART 2: CONVERSION FUNNEL ── */}
      <div className="lg:col-span-5 glass p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
           
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-sky-600" />
             
              <span>Conversion Funnel</span>

            </h3>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Overall FTD conversion breakdown</p>

          </div>
        
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full tracking-wider">

            Attribution

          </span>

        </div>





        {/* Funnel Layout */}


        <div className="flex-1 flex flex-col justify-center space-y-4">
          {mockFunnel.map((step, idx) => {

            return (

              <div key={idx} className="space-y-1.5">

                <div className="flex justify-between text-xs font-semibold">

                  <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wide">{step.label}</span>

                  <span className="text-slate-800 dark:text-slate-200 font-display">

                    {step.value.toLocaleString()} <span className="text-slate-400 dark:text-slate-500 font-normal">({step.pct}%)</span>

                  </span>
                  
                </div>
                
                {/* Horizontal Progress Bar */}

                <div className="h-3.5 bg-slate-100 dark:bg-slate-850 rounded-lg overflow-hidden border border-slate-200/20 dark:border-slate-800/10">
                  <div 
                    className={`h-full rounded-lg transition-all duration-500 ${
                      idx === 0 
                        ? 'bg-gradient-to-r from-sky-400 to-sky-500' 
                        : idx === 1 
                          ? 'bg-gradient-to-r from-brand-400 to-brand-500' 
                          : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    }`}


                    style={{ width: `${step.pct}%` }}



                  />
               
              
              
                </div>

              </div>
            );
          }
          )
          }

        </div>




        {/* Informative Footer */}



        <div className="mt-4 p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 leading-relaxed flex items-start gap-1.5 rounded-lg">

          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />


          <span>Rates calculated based on click-through registrations. Custom campaign filters can be selected via reports.</span>



        </div>

      </div>

    </div>
  );
}
