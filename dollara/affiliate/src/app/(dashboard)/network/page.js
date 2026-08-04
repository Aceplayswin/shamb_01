'use client';

import { useState, useMemo } from 'react';
import { Share2, Search, Plus } from 'lucide-react';
import { mockSubAffiliates } from '../../../lib/mockData';
import OverrideSummary from './_components/OverrideSummary';
import SubAffiliateTable from './_components/SubAffiliateTable';
import InviteSubModal from './_components/InviteSubModal';





export default function NetworkPage() {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);




  const filtered = useMemo(() => {
    if (!search.trim()) return mockSubAffiliates;
    return mockSubAffiliates.filter((sub) =>
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);




  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">


            Sub-Affiliates & Network


          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">


            Recruit sub-agents to your network and monitor multi-tier commission overrides.


          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          
          
           Invite Sub-Affiliate


        </button>
      </div>






      {/* Overview stats */}
      <OverrideSummary items={mockSubAffiliates} />



      {/* Table controls */}
      <div className="flex items-center justify-between gap-4">

        <div className="relative max-w-xs flex-1">


          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sub-affiliates..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          />

        </div>

      </div>

      {/* Network Tree/Table */}
      <SubAffiliateTable items={filtered} />




      {/* Invite Modal */}
      {showInviteModal && (
        <InviteSubModal onClose={() => setShowInviteModal(false)} />
      )}

      
    </div>
  );
}
