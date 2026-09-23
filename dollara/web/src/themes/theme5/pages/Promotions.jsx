'use client';

// Theme5 Promotions — offer posters from admin Content → Promotions
// (image grid on /promotions, not bonus claim cards).

import { Gift } from 'lucide-react';
import { usePromotionPosters } from '@/hooks/usePromotionPosters';
import PromotionPosterCard from '@/components/PromotionPosterCard';
import { T5Card } from '../components/ui';

export default function Theme5Promotions() {
  const { posters, loading } = usePromotionPosters();

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-4 sm:py-6">
      <div className="flex overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="theme5-tab py-2.5 pl-4">
          <h1 className="whitespace-nowrap text-sm font-black uppercase tracking-wide text-white sm:text-base">
            Promotions
          </h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--t5-muted)]">
        Current offers and deals. Tap a poster for details.
      </p>

      {loading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <T5Card key={i} className="aspect-[16/9] animate-pulse" />
          ))}
        </div>
      ) : posters.length === 0 ? (
        <T5Card className="mt-4 flex flex-col items-center gap-2 p-12 text-center">
          <Gift className="h-8 w-8 text-[var(--t5-blue)]" />
          <p className="font-display text-lg font-black text-[var(--t5-ink)]">
            No active promotions right now
          </p>
          <p className="text-sm text-[var(--t5-muted)]">Check back soon for new offers.</p>
        </T5Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {posters.map((p) => (
            <PromotionPosterCard
              key={p.id}
              poster={p}
              className="bg-white shadow-sm transition hover:shadow-md"
            />
          ))}
        </div>
      )}
    </div>
  );
}
