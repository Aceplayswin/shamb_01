'use client';

// Theme5 Play — reuses the shared GamePlayView with the theme5 variant. The
// dynamic route param is read here (the route dispatcher passes no props).

import { useParams } from 'next/navigation';
import { GamePlayView } from '@/components/GamePlayView';

export default function Theme5Play() {
  const { slug } = useParams();
  return <GamePlayView slug={slug} variant="theme5" />;
}
