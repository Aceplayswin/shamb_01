'use client';

// Theme4 Play — reuses the shared GamePlayView with the theme4 (teal) variant.

import { useParams } from 'next/navigation';
import { GamePlayView } from '@/components/GamePlayView';

export default function Theme4Play() {
  const { slug } = useParams();
  return <GamePlayView slug={slug} variant="theme4" />;
}
