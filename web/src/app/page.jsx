'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Play, ChevronDown, Search, ChevronLeft, ChevronRight, Zap, X } from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const PROVIDERS = ['MAC88', '18PEACHES', 'VELIPLAY', 'AVIATRIX', 'INOUT', 'GALAXSYS', 'SMARTSOFT', '2J', 'TURBOGAMES WORLD', 'AURA GAMING', 'LOTTO', 'PGGAMING', 'ODIN COCKFIGHTING'];

const LIVE_SPORTS = [
  { id: 's1', name: 'Lucky Sports', provider: 'MAC88' },
  { id: 's2', name: 'E-Sports', provider: 'VELIPLAY' },
  { id: 's3', name: 'Football', provider: '18PEACHES' },
];

const CASINO_GAMES = [
  { id: 'c1', name: 'Microgaming', provider: 'MAC88' },
  { id: 'c2', name: 'Aviator', provider: 'AVIATRIX' },
  { id: 'c3', name: 'Live Dealer', provider: 'INOUT' },
  { id: 'c4', name: 'Mines', provider: 'GALAXSYS' },
  { id: 'c5', name: 'Crazy Time', provider: 'SMARTSOFT' },
  { id: 'c6', name: 'Go Rush', provider: '2J' },
];

const TRENDING_GAMES = [
  { id: 't1', name: 'Crazy Time', provider: 'SMARTSOFT' },
  { id: 't2', name: 'Forest Arrow', provider: 'TURBOGAMES WORLD' },
  { id: 't3', name: 'Monopoly Live', provider: 'AURA GAMING' },
  { id: 't4', name: 'Super Andar Bahar', provider: 'LOTTO' },
  { id: 't5', name: 'Crazy Pachinko', provider: 'PGGAMING' },
  { id: 't6', name: 'Fan Tan', provider: 'ODIN COCKFIGHTING' },
];

const TRENDING_SLOTS = [
  { id: 'sl1', name: 'Cockfighting', provider: 'ODIN COCKFIGHTING' },
  { id: 'sl2', name: 'WCC Live', provider: 'PGGAMING' },
  { id: 'sl3', name: 'WGC', provider: 'LOTTO' },
  { id: 'sl4', name: 'Admiral Wild', provider: 'AURA GAMING' },
  { id: 'sl5', name: 'Brazilian Mask', provider: 'TURBOGAMES WORLD' },
  { id: 'sl6', name: 'Cash Multiplier', provider: '2J' },
];

const ALL_GAMES = [...LIVE_SPORTS, ...CASINO_GAMES, ...TRENDING_GAMES, ...TRENDING_SLOTS];

const PARTNERS = ['Caleta', 'CQ9', 'Endorphina', 'Evolution', 'Evoplay', 'PG Soft', 'Pragmatic Play', 'Saba Sports'];

function SectionTitle({ title, icon, onSeeAll }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide">
        <span className="w-1 h-5 bg-brand-500 rounded-sm"></span>
        {icon}
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <button className="p-1 rounded-full bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button className="p-1 rounded-full bg-surface-800 text-slate-400 hover:text-white hover:bg-surface-700 transition">
          <ChevronRight className="w-5 h-5" />
        </button>
        {onSeeAll && (
          <button className="ml-2 px-3 py-1 bg-brand-500 text-surface-900 text-xs font-bold rounded hover:bg-brand-400 transition flex items-center gap-1">
            <Search className="w-3 h-3" /> SEE ALL
          </button>
        )}
      </div>
    </div>
  );
}

function GameCard({ item, onPlay, heightClass = 'h-48' }) {
  return (
    <div
      onClick={() => onPlay(item)}
      className={`shrink-0 snap-start rounded-xl bg-surface-800 border border-surface-700 overflow-hidden relative group cursor-pointer w-40 sm:w-48 md:w-56 ${heightClass}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-surface-700 to-surface-900 flex flex-col items-center justify-center`}>
         <span className="text-white/80 font-bold text-center p-2 text-lg">{item.name}</span>
         <span className="text-brand-500/80 font-bold text-xs mt-1 uppercase tracking-wider">{item.provider}</span>
      </div>
      
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <button className="bg-brand-500 rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-surface-900 fill-current" />
         </button>
      </div>
    </div>
  );
}

function Carousel({ items, heightClass = 'h-48', onPlay }) {
  return (
    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
      {items.map((item) => (
        <GameCard key={item.id} item={item} onPlay={onPlay} heightClass={heightClass} />
      ))}
    </div>
  );
}

function Accordion({ question, answer, isOpen, onClick }) {
  return (
    <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-700/50 transition-colors"
      >
        <span className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wide">
          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
          {question}
        </span>
        <div className={`p-1 rounded bg-surface-700 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronDown className="w-4 h-4 text-slate-300" />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-sm text-slate-400 border-t border-surface-700 bg-surface-800/50">
          <p className="mt-4">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const handlePlayGame = (game) => {
    Swal.fire({
      title: 'Ready to Play?',
      text: `You are going to play ${game.name}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff9800',
      cancelButtonColor: '#333333',
      confirmButtonText: 'Yes, Play Now!',
      background: '#1a1a1a',
      color: '#fff',
      customClass: {
        popup: 'border border-surface-700 rounded-xl',
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Starting...',
          text: `Launching ${game.name}!`,
          icon: 'success',
          background: '#1a1a1a',
          color: '#fff',
          confirmButtonColor: '#ff9800'
        });
      }
    });
  };

  const filteredGames = ALL_GAMES.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider ? game.provider === selectedProvider : true;
    return matchesSearch && matchesProvider;
  });

  // Remove duplicates for display in filtered view since some games might be in multiple lists
  const uniqueFilteredGames = Array.from(new Map(filteredGames.map(item => [item.id, item])).values());

  const isFiltering = searchQuery !== '' || selectedProvider !== null;

  return (
    <>
      <Header />
      <main className="bg-surface-900 min-h-screen">
        <div className="mx-auto max-w-[1400px] px-4 py-6 xl:px-6 space-y-8">
          
          {!isFiltering && (
            <>
              {/* Hero Banners */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-900 to-black p-8 sm:p-12 border border-surface-700 min-h-[300px] flex flex-col justify-center">
                  <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 italic">
                    WELCOME BONUS
                  </h2>
                  <h3 className="text-6xl sm:text-7xl font-black text-yellow-500 italic drop-shadow-lg mt-2">
                    5%
                  </h3>
                  <p className="mt-4 text-yellow-500 font-bold tracking-widest text-sm uppercase">On your first deposit!</p>
                  <h4 className="text-5xl sm:text-6xl font-black text-white italic drop-shadow-md mt-2">
                    UP TO <span className="text-yellow-500">₹5000</span>
                  </h4>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-yellow-900 to-black p-8 sm:p-12 border border-surface-700 min-h-[300px] flex flex-col justify-center items-end text-right">
                  <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 italic">
                    DEPOSIT BONUS
                  </h2>
                  <p className="mt-4 text-yellow-500 font-bold tracking-widest text-sm uppercase">Deposit now and get extra</p>
                  <h3 className="text-6xl sm:text-7xl font-black text-yellow-500 italic drop-shadow-lg mt-2">
                    100/-
                  </h3>
                  <p className="text-yellow-600 font-black tracking-widest text-lg uppercase mt-2">No Wagering</p>
                </div>
              </div>

              {/* Ticker */}
              <div className="flex bg-surface-800 rounded-lg overflow-hidden border border-surface-700 h-10 items-center">
                <div className="bg-brand-500 h-full px-4 flex items-center justify-center font-bold text-xs uppercase text-surface-900 shrink-0 gap-2">
                   <Zap className="w-4 h-4" /> LATEST NEWS
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <div className="whitespace-nowrap animate-[marquee_20s_linear_infinite] text-xs font-bold text-slate-300 tracking-wide">
                    LIVE CASINO GAMES LAUNCHING IN 7 DAYS • MEGA SLOTS TOURNAMENT STARTS IN 10 DAYS • WEEKLY CASHBACK UPDATE VERSION 2.0 RELEASING SOON
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Search/Filter Bar */}
          <div className="bg-surface-800 rounded-xl p-4 border border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10">
             <div className="flex items-center gap-4 text-white w-full sm:w-auto">
                <span className="font-bold uppercase tracking-widest text-sm whitespace-nowrap hidden sm:block">PREMIER <span className="text-brand-500">BETTING</span> EXPERIENCE</span>
                <span className="h-px w-12 bg-white/20 hidden sm:block"></span>
                <span className="font-bold text-xl tracking-tighter italic"><span className="text-brand-500">DOLLARA</span></span>
             </div>
             <div className="relative w-full sm:w-72 flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search games..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg p-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                )}
             </div>
          </div>

          {/* Providers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="GAME PROVIDERS" />
              {selectedProvider && (
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="text-xs text-brand-500 hover:text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear Filter
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {PROVIDERS.map(p => (
                <button 
                  key={p} 
                  onClick={() => setSelectedProvider(p === selectedProvider ? null : p)}
                  className={`shrink-0 px-6 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                    p === selectedProvider 
                      ? 'bg-brand-500 border-brand-500 text-surface-900' 
                      : 'border-surface-700 bg-surface-800 hover:bg-surface-700 text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {isFiltering ? (
            <section className="min-h-[400px]">
               <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">
                 Search Results ({uniqueFilteredGames.length})
               </h2>
               {uniqueFilteredGames.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                   {uniqueFilteredGames.map(game => (
                     <GameCard key={game.id} item={game} onPlay={handlePlayGame} heightClass="h-48 w-full" />
                   ))}
                 </div>
               ) : (
                 <div className="text-center text-slate-500 py-12">
                   <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p className="text-lg font-bold">No games found.</p>
                   <p className="text-sm mt-2">Try adjusting your search or provider filter.</p>
                 </div>
               )}
            </section>
          ) : (
            <>
              {/* Carousels */}
              <section>
                <SectionTitle title="LIVE SPORTS" icon="⚽" onSeeAll />
                <Carousel items={LIVE_SPORTS} heightClass="h-48 md:h-64" onPlay={handlePlayGame} />
              </section>

              <section>
                <SectionTitle title="CASINO (PROVIDER LOBBY)" icon="🔴" onSeeAll />
                <Carousel items={CASINO_GAMES} heightClass="h-48" onPlay={handlePlayGame} />
              </section>

              <section>
                <SectionTitle title="TRENDING GAMES" icon="🔥" onSeeAll />
                <Carousel items={TRENDING_GAMES} heightClass="h-48 md:h-56" onPlay={handlePlayGame} />
              </section>

              <section>
                <SectionTitle title="TRENDING SLOT" icon="🎰" onSeeAll />
                <Carousel items={TRENDING_SLOTS} heightClass="h-48 md:h-56" onPlay={handlePlayGame} />
              </section>

              {/* Partnerships */}
              <section className="py-8">
                <div className="text-center mb-8">
                  <h2 className="text-xs tracking-[0.2em] font-bold text-slate-500 uppercase mb-2">Worldwide Partnerships</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                   {PARTNERS.map(partner => (
                     <div key={partner} className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 aspect-video hover:bg-surface-700 transition cursor-pointer group">
                        <span className="font-bold text-slate-300 group-hover:text-white transition">{partner}</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest">Official Partner</span>
                     </div>
                   ))}
                </div>
              </section>

              {/* Why Choose */}
              <section className="py-8">
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-2 mb-2">
                   <span className="w-1.5 h-6 bg-brand-500 rounded-sm"></span>
                   WHY CHOOSE <span className="text-brand-500">DOLLARA?</span>
                </h2>
                <p className="text-xs text-slate-500 font-bold tracking-[0.2em] uppercase mb-8 ml-4">Why we're different</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'FAST WITHDRAWAL', icon: '🕒' },
                    { title: 'INSTANT DEPOSIT', icon: '💳' },
                    { title: '1-CLICK SIGNUP', icon: '👤' },
                    { title: 'TRUSTED PLATFORM', icon: '🛡️' },
                  ].map((feature, idx) => (
                    <div key={idx} className="bg-surface-800 border border-surface-700 rounded-xl p-6 flex flex-col items-center text-center hover:border-brand-500/50 transition relative overflow-hidden group">
                       <div className="absolute top-4 right-4 text-[10px] font-black text-surface-700 group-hover:text-brand-500/20 transition">
                          0{idx + 1}
                       </div>
                       <div className="text-4xl mb-4 opacity-80 group-hover:opacity-100 transition group-hover:scale-110">{feature.icon}</div>
                       <h3 className="font-bold text-white tracking-widest text-sm">{feature.title}</h3>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section className="py-12 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-4">
                     💡 Knowledge Base
                  </div>
                  <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
                    FREQUENTLY ASKED <span className="text-brand-500">QUESTIONS (FAQ)</span>
                  </h2>
                  <div className="w-16 h-1 bg-brand-500 mx-auto mt-4 rounded-full"></div>
                </div>

                <div className="space-y-3">
                  {[
                    { q: 'WHY IS THIS ONE OF THE BEST ONLINE BETTING SITES IN INDIA?', a: 'THIS IS A TRUSTED BETTING PLATFORM OFFERING FAST TRANSACTIONS AND SECURE GAMING EXPERIENCES.' },
                    { q: 'IS ONLINE BETTING LEGAL IN INDIA?', a: 'Yes, there are no federal laws explicitly prohibiting online betting in most parts of India.' },
                    { q: 'HOW DO I WITHDRAW MY WINNINGS?', a: 'You can instantly withdraw using your preferred payment method like UPI or bank transfer.' },
                    { q: 'CAN I EVER WIN IN AN ONLINE CASINO?', a: 'Absolutely. We offer fair games with certified RNG (Random Number Generators).' },
                    { q: 'IS ONLINE CASINO GAMES A SKILL OR LUCK?', a: 'It depends on the game. Slots are luck-based, while games like Poker and Blackjack involve skill.' },
                  ].map((faq, idx) => (
                    <Accordion
                      key={idx}
                      question={faq.q}
                      answer={faq.a}
                      isOpen={openFaq === idx}
                      onClick={() => setOpenFaq(idx === openFaq ? -1 : idx)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
