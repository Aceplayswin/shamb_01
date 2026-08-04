'use client';

import { useState, useMemo } from 'react';
import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';
import { mockReferrals } from '../../../lib/mockData';
import StatusFilter from './_components/StatusFilter';
import ReferralTable from './_components/ReferralTable';
import ReferralDetailPanel from './_components/ReferralDetailPanel';




export default function ReferralsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);





  // Compute counts
  const counts = useMemo(() => ({
    total:   mockReferrals.length,
    active:  mockReferrals.filter((p) => p.status === 'active').length,
    dormant: mockReferrals.filter((p) => p.status === 'dormant').length,
    blocked: mockReferrals.filter((p) => p.status === 'blocked').length,
  }), []);



  // Filter players
  const filtered = useMemo(() => {
    let list = mockReferrals;
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) list = list.filter((p) => p.id.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [statusFilter, search]);

  

  // Summary stats
  const totalPlayers = mockReferrals.length;
  const activePlayers = counts.active;
  const ftdRate = totalPlayers > 0
    ? ((mockReferrals.filter((p) => p.ftdDate).length / totalPlayers) * 100).toFixed(0)
    : 0;  
    
  const totalCommission = mockReferrals.reduce((sum, p) => sum + p.commission, 0);



  const summaryCards = [
    { label: 'Total Players',    value: totalPlayers,                         icon: Users,     accent: 'text-brand-600 dark:text-brand-400' },
    { label: 'Active Players',   value: activePlayers,                        icon: UserCheck, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'FTD Rate',         value: `${ftdRate}%`,                        icon: TrendingUp,accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Total Commission', value: `$${totalCommission.toLocaleString()}`, icon: DollarSign, accent: 'text-violet-600 dark:text-violet-400' },
  ];


  return (
    <>
      <div className="space-y-6 animate-fade-up">



        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            My Referrals
          </h1>


          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all referred players, their deposits, and commission earned.
          </p>


        </div>




        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none p-4 transition-colors duration-300 hover:scale-[1.01]">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`w-4 h-4 ${accent}`} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
              </div>
              <span className="text-xl font-black font-display text-slate-900 dark:text-slate-100">{value}</span>
            </div>
          ))}
        </div>





        {/* Status filter */}
        <StatusFilter current={statusFilter} onChange={setStatusFilter} counts={counts} />




        {/* Table */}
        <ReferralTable
          players={filtered}
          search={search}
          onSearchChange={setSearch}
          onSelect={(player) => setSelectedPlayer(player)}
        />
      </div>




      {/* Detail panel */}
      {selectedPlayer && (
        <ReferralDetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}


    </>
  );
}
