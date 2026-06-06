'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GameCard } from '@/components/GameCard';
import { api } from '@/services/api';

const CATEGORY_MAP = {
  lottery: 'lottery',
  'live-casino': 'live_casino',
  sports: 'sports',
  slots: 'slots',
  fantasy: 'fantasy',
  ai: 'ai_games',
};

export default function GamesCategoryPage() {
  const params = useParams();
  const category = CATEGORY_MAP[params.category] ?? params.category;
  const [games, setGames] = useState([]);

  useEffect(() => {
    api(`/api/v1/games?category=${category}`)
      .then(setGames)
      .catch(() => setGames([]));
  }, [category]);

  const title = params.category?.replace(/-/g, ' ') ?? 'Games';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold capitalize">{title}</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        {games.length === 0 && (
          <p className="mt-8 text-center text-slate-500">No games found. Start API and seed DB.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
