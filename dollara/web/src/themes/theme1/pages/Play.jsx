'use client';

import { useParams } from 'next/navigation';
import { GamePlayView } from '@/components/GamePlayView';

export default function Theme1Play() {
  const { slug } = useParams();
  return <GamePlayView slug={slug} variant="theme1" />;
}
