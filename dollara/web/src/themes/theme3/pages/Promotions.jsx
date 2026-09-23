'use client';

// Theme3 Promotions — offer posters from admin Content → Promotions (image
// grid on /promotions, not bonus claim cards — those live on /bonus). Cream/
// gold styling to match the rest of VELPLAY.

import { Gift } from 'lucide-react';
import { usePromotionPosters } from '@/hooks/usePromotionPosters';
import PromotionPosterCard from '@/components/PromotionPosterCard';
import { T3Card, T3FormPage } from '../components/ui';

export default function Theme3Promotions() {
  const { posters, loading } = usePromotionPosters();

  return (
    <T3FormPage title="Promotions" subtitle="Current offers and deals. Tap a poster for details." maxWidth="max-w-5xl">
      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-2xl bg-black/[0.04]" />
          ))}
        </div>
      ) : posters.length === 0 ? (
        <T3Card className="mt-6 flex flex-col items-center gap-2 p-12 text-center">
          <Gift className="h-8 w-8 text-[#c79a3b]" />
          <p className="font-display text-lg font-black text-[#1b1726]">No active promotions right now</p>
          <p className="text-sm text-[#6b6579]">Check back soon for new offers.</p>
        </T3Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {posters.map((p) => (
            <PromotionPosterCard
              key={p.id}
              poster={p}
              className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-32px_rgba(36,27,58,0.45)] transition hover:-translate-y-0.5 hover:shadow-lg"
            />
          ))}
        </div>
      )}
    </T3FormPage>
  );
}
