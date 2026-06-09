"""Admin-side gaming management: status control, analytics, and reports.

Separated from the generic ``admin_services`` module to keep the gaming domain
cohesive. Covers the legacy admin surface from games.md:

- Master GAME_STATUS toggle (enable/disable all launches).
- Recently-played feed + searchable round history.
- P&L analytics (24h + N-day series) and per-game leaderboards.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from core.models import Game, GameRound, GameSession
from core.repositories import GameSettingsRepository

ZERO = Decimal('0')


# --- Master on/off control (legacy GAME_STATUS) ---

def get_game_status() -> dict:
    return {'enabled': GameSettingsRepository.is_games_enabled()}


def set_game_status(enabled: bool) -> dict:
    GameSettingsRepository.set_games_enabled(enabled)
    return {'enabled': bool(enabled)}


# --- Recently played / round history ---

def list_recent_rounds(
    limit: int = 50,
    offset: int = 0,
    user_id: int | None = None,
    game_uid: str | None = None,
) -> list[dict]:
    qs = GameRound.objects.select_related('user', 'game').order_by('-created_at')
    if user_id:
        qs = qs.filter(user_id=user_id)
    if game_uid:
        qs = qs.filter(game_uid=game_uid)
    return [
        {
            'id': r.id,
            'user_id': r.user_id,
            'username': r.user.username if r.user else None,
            'game_uid': r.game_uid,
            'game_name': r.game.name if r.game else None,
            'serial_number': r.serial_number,
            'game_round': r.game_round,
            'bet_amount': float(r.bet_amount),
            'win_amount': float(r.win_amount),
            'profit_loss': float(r.win_amount - r.bet_amount),
            'balance_after': float(r.balance_after) if r.balance_after is not None else None,
            'created_at': r.created_at.isoformat(),
        }
        for r in qs[offset : offset + limit]
    ]


# --- Statistics / P&L analytics ---

def get_game_statistics() -> dict:
    """House-side summary: 24h and all-time GGR (bet - win) + volume."""
    now = timezone.now()
    day_ago = now - timedelta(hours=24)

    def _agg(qs) -> dict:
        a = qs.aggregate(
            bet=Sum('bet_amount'), win=Sum('win_amount'), rounds=Count('id')
        )
        bet = a['bet'] or ZERO
        win = a['win'] or ZERO
        return {
            'total_bet': float(bet),
            'total_win': float(win),
            'ggr': float(bet - win),  # gross gaming revenue (house edge)
            'rounds': a['rounds'] or 0,
        }

    return {
        'last24h': _agg(GameRound.objects.filter(created_at__gte=day_ago)),
        'allTime': _agg(GameRound.objects.all()),
        'activeSessions': GameSession.objects.filter(
            last_played_at__gte=now - timedelta(minutes=30)
        ).count(),
        'totalSessions': GameSession.objects.count(),
        'enabled': GameSettingsRepository.is_games_enabled(),
    }


def get_pnl_series(days: int = 7) -> list[dict]:
    """Daily bet/win/GGR series for the dashboard chart."""
    today = timezone.now().date()
    series = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        agg = GameRound.objects.filter(created_at__date=day).aggregate(
            bet=Sum('bet_amount'), win=Sum('win_amount'), rounds=Count('id')
        )
        bet = agg['bet'] or ZERO
        win = agg['win'] or ZERO
        series.append({
            'date': day.isoformat(),
            'label': day.strftime('%a'),
            'total_bet': float(bet),
            'total_win': float(win),
            'ggr': float(bet - win),
            'rounds': agg['rounds'] or 0,
        })
    return series


def get_top_games(limit: int = 10) -> list[dict]:
    """Most-wagered games leaderboard with GGR."""
    rows = (
        GameRound.objects.values('game_uid')
        .annotate(
            bet=Sum('bet_amount'),
            win=Sum('win_amount'),
            rounds=Count('id'),
            players=Count('user_id', distinct=True),
        )
        .order_by('-bet')[:limit]
    )
    uid_to_name = {
        g.game_uid: g.name
        for g in Game.objects.filter(
            game_uid__in=[r['game_uid'] for r in rows]
        )
    }
    return [
        {
            'game_uid': r['game_uid'],
            'game_name': uid_to_name.get(r['game_uid'], r['game_uid']),
            'total_bet': float(r['bet'] or ZERO),
            'total_win': float(r['win'] or ZERO),
            'ggr': float((r['bet'] or ZERO) - (r['win'] or ZERO)),
            'rounds': r['rounds'],
            'players': r['players'],
        }
        for r in rows
    ]
