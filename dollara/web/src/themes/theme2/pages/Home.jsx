'use client';

// Theme 2 home — WAXCASINO-style lobby: top tab nav, hero carousel + feature
// cards, trending / live-casino rows, top providers, promotions, feature strip,
// and a right-hand rail (General Chat, Recent Big Wins, Bet Slip).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dices, Sparkles, Tv, LayoutGrid, Rocket, Trophy, Gamepad2,
  Flame, Circle, Gift, ChevronRight, Send, Info, Zap, ShieldCheck, Award, Play,
} from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import {
  filterByCategory,
  filterFeatured,
  NAV_GAME_LINKS,
  playPath,
} from '@/lib/gameRoutes';

const TABS = [
  { id: 'lobby', label: 'Lobby', Icon: LayoutGrid },
  { id: 'slots', label: 'Slots', Icon: Sparkles },
  { id: 'live', label: 'Live Casino', Icon: Tv },
  { id: 'table', label: 'Table Games', Icon: Dices },
  { id: 'crash', label: 'Crash', Icon: Rocket },
  { id: 'sports', label: 'Sports', Icon: Trophy },
  { id: 'all', label: 'All Games', Icon: Gamepad2 },
];

const HUES = [
  'from-amber-500/40',
  'from-emerald-500/40',
  'from-fuchsia-500/40',
  'from-rose-500/40',
  'from-pink-500/40',
  'from-indigo-500/40',
];

const TAB_CATEGORIES = {
  slots: ['slots'],
  live: ['live_casino'],
  table: ['ai_games'],
  crash: ['ai_games'],
  sports: ['sports', 'virtual_sports'],
};

const PROMOS = [
  { title: 'Welcome Bonus', amount: '100% up to $1000', cta: 'Claim Now' },
  { title: 'Reload Bonus', amount: '50% up to $500', cta: 'Claim Now' },
  { title: 'Cashback Bonus', amount: '10% Weekly Cashback', cta: 'Claim Now' },
  { title: 'VIP Exclusive', amount: 'Up to 35% Rakeback', cta: 'Claim Now' },
];

const CHAT = [
  { user: 'Dianne Lane', msg: 'Just won on Sweet Bonanza! 🤑', ago: '2m' },
  { user: 'Darrell Steward', msg: 'Big win on Gates of Olympus! 😄', ago: '4m' },
  { user: 'Ralph Edwards', msg: "Anyone playing Roulette? I'm on a lucky streak!", ago: '6m' },
  { user: 'Jane Cooper', msg: 'Love the new VIP rewards! So worth it!', ago: '8m' },
  { user: 'Annette Black', msg: 'The cashback is insane 🔥', ago: '12m' },
  { user: 'Esther Howard', msg: 'Crypto deposits are so fast! 🚀', ago: '15m' },
  { user: 'Cody Fisher', msg: 'Great games, great community!', ago: '18m' },
];

const BIG_WINS = [
  { user: 'Brooklyn S.', game: 'Book of Dead', amount: '$12,540' },
  { user: 'Wade Warren', game: 'Sweet Bonanza', amount: '$8,230' },
  { user: 'Esther H.', game: 'Gates of Olympus', amount: '$6,780' },
  { user: 'Dianne Lane', game: 'Mega Wheel', amount: '$5,100' },
  { user: 'Cody Fisher', game: 'Sugar Rush', amount: '$4,890' },
];

/* ── small pieces ── */
function GameTile({ item, onPlay }) {
  const hue = item.hue || HUES[(item.id ?? 0) % HUES.length];
  return (
    <button
      onClick={() => onPlay(item)}
      className="group flex shrink-0 flex-col text-left"
    >
      <span className={`relative grid aspect-[3/4] w-32 place-items-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${hue} via-[#0d1420] to-[#070d16] sm:w-36`}>
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/40" />
        <span className="relative grid h-12 w-12 scale-90 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-0 shadow-glow transition group-hover:scale-100 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-black text-black" />
        </span>
      </span>
      <span className="mt-2 w-32 truncate text-sm font-bold text-white sm:w-36">{item.name}</span>
      <span className="w-32 truncate text-xs text-slate-500 sm:w-36">{item.provider_name ?? item.provider}</span>
    </button>
  );
}

function LiveTile({ item, onPlay }) {
  return (
    <button
      onClick={() => onPlay(item)}
      className="group flex shrink-0 flex-col text-left"
    >
      <span className="relative grid aspect-square w-32 place-items-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-slate-700/40 via-[#0d1420] to-[#070d16] sm:w-36">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Tv className="h-8 w-8 text-slate-500 transition group-hover:text-amber-400" />
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.55rem] font-bold uppercase text-emerald-300 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </span>
      <span className="mt-2 w-32 truncate text-sm font-bold text-white sm:w-36">{item.name}</span>
      <span className="w-32 truncate text-xs text-slate-500 sm:w-36">{item.provider_name ?? item.provider}</span>
    </button>
  );
}

function RowHeader({ Icon, title, color = 'text-amber-400', seeAllHref }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <Icon className={`h-5 w-5 ${color}`} /> {title}
      </h2>
      {seeAllHref ? (
        <Link href={seeAllHref} className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10">
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export default function Theme2Home() {
  const router = useRouter();
  const { games, loading, error } = useGameCatalog();
  const [tab, setTab] = useState('lobby');
  const [betTab, setBetTab] = useState('single');

  const trending = useMemo(() => filterFeatured(games, 10), [games]);
  const live = useMemo(() => filterByCategory(games, 'live_casino').slice(0, 10), [games]);
  const providers = useMemo(
    () => [...new Set(games.map((g) => g.provider_name).filter(Boolean))].slice(0, 7),
    [games],
  );

  const tabGames = useMemo(() => {
    if (tab === 'lobby' || tab === 'all') return games;
    const cats = TAB_CATEGORIES[tab];
    return cats ? filterByCategory(games, cats) : games;
  }, [games, tab]);

  const handlePlay = (game) => {
    if (game?.slug) router.push(playPath(game));
  };

  return (
    <div className="mx-auto flex max-w-[1400px] gap-5 px-4 py-5 xl:px-6">
      {/* ===== Main column ===== */}
      <div className="min-w-0 flex-1 space-y-8">
        {/* Tab nav */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                tab === id ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-amber-600/20 via-[#0d1420] to-[#070d16] p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative max-w-md">
            <h1 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl">
              Top 1 Casino on the<br />WAS Network
            </h1>
            <p className="mt-3 text-sm text-slate-400">Login via Web3 Wallets</p>
            <div className="mt-6 flex gap-3">
              <Link href="/register" className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-6 py-2.5 text-sm font-bold text-black shadow-glow transition hover:from-amber-300 hover:to-amber-500">
                Play Now
              </Link>
              <Link href={NAV_GAME_LINKS.slots} className="rounded-lg border border-white/10 px-6 py-2.5 text-sm font-bold text-white transition hover:border-amber-400/50">
                Browse Games
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2">
              {['from-rose-500', 'from-sky-500', 'from-fuchsia-500'].map((c, i) => (
                <span key={i} className={`h-7 w-7 rounded-full bg-gradient-to-br ${c} to-slate-900 ring-2 ring-[#0d1420]`} />
              ))}
              <span className="ml-2 flex gap-1">
                {[0, 1, 2, 3, 4].map((d) => (
                  <span key={d} className={`h-1.5 rounded-full ${d === 0 ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/20'}`} />
                ))}
              </span>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-600/15 via-[#0d1420] to-[#070d16] p-6">
            <h3 className="font-display text-xl font-bold text-white">Sports</h3>
            <p className="mt-1 text-xs text-slate-400">The Thrill of Victory and the Agony of Defeat</p>
            <Link href={NAV_GAME_LINKS.sports} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2 text-xs font-bold text-black">
              Bet Now <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-600/15 via-[#0d1420] to-[#070d16] p-6">
            <h3 className="font-display text-xl font-bold text-white">New Release</h3>
            <p className="mt-1 text-xs text-slate-400">Redefining the Landscape of Casino Entertainment</p>
            <Link href={NAV_GAME_LINKS.casino} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-2 text-xs font-bold text-black">
              Play Now <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {loading ? (
          <p className="py-12 text-center text-slate-500">Loading games…</p>
        ) : error ? (
          <p className="py-12 text-center text-rose-400">{error}</p>
        ) : games.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No games found. Import database/init.sql on the API.</p>
        ) : tab !== 'lobby' ? (
          <section>
            <RowHeader Icon={Gamepad2} title={`${TABS.find((t) => t.id === tab)?.label ?? 'Games'}`} seeAllHref={tab === 'slots' ? NAV_GAME_LINKS.slots : tab === 'sports' ? NAV_GAME_LINKS.sports : tab === 'live' ? NAV_GAME_LINKS.liveCasino : tab === 'crash' || tab === 'table' ? NAV_GAME_LINKS.crash : undefined} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {tabGames.map((g, i) => (
                <GameTile key={g.id} item={{ ...g, hue: HUES[i % HUES.length] }} onPlay={handlePlay} />
              ))}
            </div>
          </section>
        ) : (
          <>
        {/* Trending */}
        <section>
          <RowHeader Icon={Flame} title="Trending Games" seeAllHref={NAV_GAME_LINKS.crash} />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {trending.map((g, i) => <GameTile key={g.id} item={{ ...g, hue: HUES[i % HUES.length] }} onPlay={handlePlay} />)}
          </div>
        </section>

        {/* Live Casino */}
        <section>
          <RowHeader Icon={Circle} title="Live Casino" color="text-emerald-400" seeAllHref={NAV_GAME_LINKS.liveCasino} />
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {live.map((g) => <LiveTile key={g.id} item={g} onPlay={handlePlay} />)}
          </div>
        </section>

        {/* Top Providers */}
        <section>
          <RowHeader Icon={Award} title="Top Providers" color="text-sky-400" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {providers.map((p) => (
              <div key={p} className="grid h-16 place-items-center rounded-xl border border-white/5 bg-[#0d1420] px-2 text-center text-xs font-bold text-slate-300">
                {p}
              </div>
            ))}
          </div>
        </section>

        {/* Promotions */}
        <section>
          <RowHeader Icon={Gift} title="Promotions" color="text-fuchsia-400" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMOS.map((p) => (
              <div key={p.title} className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-amber-600/10 via-[#0d1420] to-[#070d16] p-5">
                <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-amber-500/20 blur-2xl" />
                <p className="text-sm font-bold text-white">{p.title}</p>
                <p className="mt-1 font-display text-lg font-black text-amber-400">{p.amount}</p>
                <Link href="/register" className="mt-4 inline-block rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-1.5 text-xs font-bold text-black">
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
          </>
        )}

        {/* Feature strip */}
        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-white/5 bg-[#0d1420] p-5 lg:grid-cols-4">
          {[
            { Icon: Info, title: '24/7 Support', desc: 'We are always here' },
            { Icon: Zap, title: 'Lightning Fast', desc: 'Instant Withdrawals' },
            { Icon: ShieldCheck, title: 'Secure & Safe', desc: 'Your data is protected' },
            { Icon: Gift, title: 'Best Bonuses', desc: 'Big rewards every day' },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <f.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{f.title}</p>
                <p className="truncate text-xs text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* ===== Right rail (chat / big wins / bet slip) — hidden on smaller screens ===== */}
      <aside className="hidden w-[300px] shrink-0 space-y-4 xl:block">
        {/* General Chat */}
        <div className="rounded-2xl border border-white/5 bg-[#0d1420]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-sm font-bold text-white">💬 General Chat</p>
            <span className="text-xs text-slate-500">320 online</span>
          </div>
          {/* Daily bonus banner */}
          <div className="m-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 p-3">
            <p className="text-xs font-bold text-white">🎁 Daily Bonus</p>
            <p className="mt-0.5 text-[0.65rem] text-slate-400">Get a chance to win amazing prizes for free every day!</p>
            <Link href="/register" className="mt-2 inline-block rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-[0.65rem] font-bold text-black">Claim Now</Link>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto px-4 pb-3 scrollbar-hide">
            {CHAT.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-900 text-[0.6rem] font-bold text-white">
                  {c.user.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs"><span className="font-bold text-amber-400">{c.user}</span> <span className="text-slate-600">· {c.ago} ago</span></p>
                  <p className="text-xs text-slate-300">{c.msg}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-white/5 p-3">
            <input placeholder="Send a message…" className="flex-1 rounded-lg border border-white/5 bg-[#070d16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400/50" />
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recent Big Wins */}
        <div className="rounded-2xl border border-white/5 bg-[#0d1420] p-4">
          <p className="mb-3 text-sm font-bold text-white">Recent Big Wins</p>
          <div className="space-y-2.5">
            {BIG_WINS.map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-900 text-[0.6rem] font-bold text-white">
                  {w.user.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{w.user}</p>
                  <p className="truncate text-[0.65rem] text-slate-500">{w.game}</p>
                </div>
                <span className="text-xs font-bold text-emerald-400">{w.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bet Slip */}
        <div className="rounded-2xl border border-white/5 bg-[#0d1420] p-4">
          <p className="mb-3 text-sm font-bold text-white">Bet Slip</p>
          <div className="mb-3 flex gap-1 rounded-lg bg-[#070d16] p-1">
            {['single', 'combo', 'system'].map((t) => (
              <button
                key={t}
                onClick={() => setBetTab(t)}
                className={`flex-1 rounded-md py-1.5 text-xs font-bold capitalize transition ${
                  betTab === t ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="py-6 text-center text-xs text-slate-500">
            No bets selected yet.<br />Click on the odds to add a bet.
          </p>
          <div className="space-y-2 border-t border-white/5 pt-3 text-xs">
            <div className="flex justify-between text-slate-400"><span>Total Odds</span><span className="font-bold text-white">0.00</span></div>
            <div className="flex justify-between text-slate-400"><span>Total Bet</span><span className="font-bold text-white">$0.00</span></div>
          </div>
          <button className="mt-3 w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-2.5 text-sm font-bold text-black">Place Bet</button>
        </div>
      </aside>
    </div>
  );
}
