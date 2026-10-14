'use client';

// Promotions — offer posters managed in admin Content → Promotions.
// Image posters only (not bonus claim cards).

import { Gift } from 'lucide-react';
import { usePromotionPosters } from '@/hooks/usePromotionPosters';
import PromotionPosterCard from '@/components/PromotionPosterCard';

export default function Theme1Promotions() {
  const { posters, loading } = usePromotionPosters();

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Promotions</h1>
      <p className="mt-1 text-sm text-slate-400">
        Current offers and deals. Tap a poster for details.
      </p>

      {loading ? (
        <div className="mt-6 grid gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[21/9] animate-pulse rounded-xl bg-panel/60" />
          ))}
        </div>
      ) : posters.length === 0 ? (
        <div className="card-glass mt-6 flex flex-col items-center gap-2 p-12 text-center">
          <Gift className="h-8 w-8 text-brand-400" />
          <p className="text-lg font-semibold">No active promotions right now</p>
          <p className="text-sm text-slate-400">Check back soon for new offers.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {posters.map((p) => (
            <PromotionPosterCard
              key={p.id}
              poster={p}
              className="border border-hairline/10 bg-panel/40 shadow-sm transition hover:border-brand-400/30"
            />
          ))}
        </div>
      )}
    </main>
  );
}
