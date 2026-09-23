'use client';

// Theme4 Promotions — offer posters from admin Content → Promotions (image
// grid, not bonus claim cards — claiming lives on /bonus). Teal exchange
// style, following the same T4SectionBar + bordered-card pattern as Games.jsx.

import { Gift } from 'lucide-react';
import { usePromotionPosters } from '@/hooks/usePromotionPosters';
import PromotionPosterCard from '@/components/PromotionPosterCard';
import { T4SectionBar, T4Card } from '../components/ui';

export default function Theme4Promotions() {
  const { posters, loading } = usePromotionPosters();

  return (
    <div className="mx-auto max-w-[1200px] px-2 py-4 sm:px-3">
      <T4SectionBar>Promotions</T4SectionBar>
      <div className="rounded-b border border-t-0 border-black/[0.07] bg-white p-3 sm:p-4">
        <p className="text-sm text-[#5d7378]">
          Current offers and deals. Tap a poster for details.
        </p>

        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <T4Card key={i} className="aspect-[16/9] animate-pulse" />
            ))}
          </div>
        ) : posters.length === 0 ? (
          <T4Card className="mt-4 flex flex-col items-center gap-2 p-12 text-center">
            <Gift className="h-8 w-8 text-[#0e7480]" />
            <p className="font-display text-lg font-black text-[#13272b]">
              No active promotions right now
            </p>
            <p className="text-sm text-[#5d7378]">Check back soon for new offers.</p>
          </T4Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {posters.map((p) => (
              <PromotionPosterCard
                key={p.id}
                poster={p}
                className="border border-black/[0.07] bg-white shadow-sm transition hover:shadow-md"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
