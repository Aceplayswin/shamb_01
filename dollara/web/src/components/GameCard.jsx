import Link from 'next/link';
import { GameThumbnail } from '@/components/GameThumbnail';

export function GameCard({ game }) {
  return (
    <Link
      href={`/play/${game.slug}`}
      className="group card-glass overflow-hidden transition hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/10"
    >
      <div className="relative aspect-video bg-gradient-to-br from-surface-700 to-surface-800">
        {game.thumbnail_url ? (
          <GameThumbnail
            src={game.thumbnail_url}
            alt={game.name}
            className="absolute inset-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-50">
            {game.category === 'ai_games' ? '🤖' : '🎮'}
          </div>
        )}
        {game.is_provably_fair && (
          <span className="absolute left-2 top-2 rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            Provably Fair
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
          <span className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-surface-900">
            Play
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-app-fg">{game.name}</h3>
        {game.provider_name && (
          <p className="text-xs text-muted/80">{game.provider_name}</p>
        )}
        {game.play_count != null && game.play_count > 0 && (
          <p className="mt-1 text-xs text-muted/60">{game.play_count} plays</p>
        )}
      </div>
    </Link>
  );
}
