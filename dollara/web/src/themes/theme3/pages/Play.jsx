'use client';

// Theme3 Play — reuses the shared GamePlayView with the theme3 (cream) variant.

import { useParams } from 'next/navigation';
import { GamePlayView } from '@/components/GamePlayView';

export default function Theme3Play() {
  const { slug } = useParams();
  return <GamePlayView slug={slug} variant="theme3" />;
}
