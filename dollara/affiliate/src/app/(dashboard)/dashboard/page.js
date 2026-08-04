// src/app/(dashboard)/dashboard/page.js
'use client';



import React from 'react';
import { 
  MousePointerClick, 
  UserPlus, 
  BadgeDollarSign, 
  Activity, 
  TrendingUp, 
  Wallet 
} from 'lucide-react';



import { mockStats } from '../../../lib/mockData';
import StatCard from '../_components/StatCard';
import ChartPlaceholder from '../_components/ChartPlaceholder';
import TopLinksTable from '../_components/TopLinksTable';
import ActivityFeed from '../_components/ActivityFeed';



export default function DashboardPage() {

  return (
    <div className="space-y-6 animate-fade-up">
      
      {/* ── Welcome Banner ── */}

      <div className="glass p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300">
        <div>

          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">

            Welcome back, Alex! 👋

          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here is the performance report for your attributed campaigns.
          </p>

           </div>


        <div className="flex gap-2 shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
          
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Accruals Active
          </span>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 border border-brand-400/20 dark:border-brand-500/30">
            Rev Share: 45%
          </span>

        </div>


      </div>



      {/* ── 6 Stat Cards Grid ── */}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Clicks" 
          value={mockStats.clicks} 
          icon={MousePointerClick} 
          trend="+15.3%" 
        />


        <StatCard 
          title="Signups" 
          value={mockStats.signups} 
          icon={UserPlus} 
          trend="+8.7%" 
        />

        <StatCard 
          title="First Deposits (FTDs)" 
          value={mockStats.ftds} 
          icon={BadgeDollarSign} 
          trend="+12.4%" 
        />

        <StatCard 
          title="Active Players" 
          value={mockStats.activePlayers} 
          icon={Activity} 
          trend="+4.2%" 
        />

        <StatCard 
          title="Commission (This Period)" 
          value={mockStats.commission} 
          icon={TrendingUp} 
          trend="+22.8%" 
          isCurrency={true} 
        />

        <StatCard 
          title="Pending Payout" 
          value={mockStats.pendingPayout} 
          icon={Wallet} 
          trend="0%" 
          isCurrency={true} 
        />


      </div>

      {/* ── Visual Charts Section ── */}
      <ChartPlaceholder />



      {/* ── Details & Activities Layout ── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Top Performing Links Table (7 columns block) */}
        <div className="lg:col-span-7">
          <TopLinksTable />
        </div>




        {/* Right: Real-time Activity Feed (5 columns block) */}
        <div className="lg:col-span-5">
          <ActivityFeed />
        </div>
      </div>



    </div>
  );
}


