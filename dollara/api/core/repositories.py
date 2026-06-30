"""Repository layer for the gaming module.

Encapsulates all ORM/data-access for games, sessions, rounds, and the global
game toggle so the service layer stays focused on business logic and the query
shapes (select_related, indexes, locking) live in one place. Keeping data access
here also makes the services trivially mockable in tests.
"""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, F, Q, Sum

from core.models import (
    Game,
    GameCallbackLog,
    GameRound,
    GameSession,
    PlatformSetting,
    Wallet,
)

# Platform setting key that mirrors the legacy tblservices.GAME_STATUS master
# on/off switch for all game launches.
GAME_STATUS_KEY = 'game_status'


class GameRepository:
    @staticmethod
    def get_active_by_uid(game_uid: str) -> Game | None:
        # A game is launchable only when it is active and its provider has not
        # been disabled in the admin panel (games without a provider are fine).
        return (
            Game.objects.select_related('provider')
            .filter(game_uid=game_uid, is_active=True)
            .filter(Q(provider__isnull=True) | Q(provider__is_active=True))
            .first()
        )

    @staticmethod
    def get_by_uid(game_uid: str) -> Game | None:
        return Game.objects.filter(game_uid=game_uid).first()

    @staticmethod
    def get_by_id(game_id: int) -> Game | None:
        return Game.objects.filter(id=game_id).first()

    @staticmethod
    def increment_play_count(game_id: int) -> None:
        Game.objects.filter(id=game_id).update(play_count=F('play_count') + 1)


class GameSessionRepository:
    @staticmethod
    def get_open_for_user_game(user_id: int, game_uid: str) -> GameSession | None:
        """Latest non-terminal session for a user+game (reused across launches)."""
        return (
            GameSession.objects.filter(user_id=user_id, game_uid=game_uid)
            .order_by('-created_at')
            .first()
        )

    @staticmethod
    def create(**fields) -> GameSession:
        return GameSession.objects.create(**fields)

    @staticmethod
    def latest_for_settlement(user_id: int, game_uid: str) -> GameSession | None:
        """Most recent session to attribute an incoming round to.

        Mirrors the legacy behaviour of folding callbacks into the latest match
        row for the same user + game UID.
        """
        return (
            GameSession.objects.filter(user_id=user_id, game_uid=game_uid)
            .order_by('-created_at')
            .first()
        )

    @staticmethod
    def list_for_user(user_id: int, limit: int, offset: int) -> list[GameSession]:
        return list(
            GameSession.objects.filter(user_id=user_id)
            .select_related('game')
            .order_by('-updated_at')[offset : offset + limit]
        )

    @staticmethod
    def count_for_user(user_id: int) -> int:
        return GameSession.objects.filter(user_id=user_id).count()


class GameRoundRepository:
    @staticmethod
    def exists(serial_number: str) -> bool:
        return GameRound.objects.filter(serial_number=serial_number).exists()

    @staticmethod
    def create(**fields) -> GameRound:
        return GameRound.objects.create(**fields)

    @staticmethod
    def user_pnl(user_id: int) -> dict:
        agg = GameRound.objects.filter(user_id=user_id).aggregate(
            total_bet=Sum('bet_amount'),
            total_win=Sum('win_amount'),
            rounds=Count('id'),
        )
        bet = agg['total_bet'] or Decimal('0')
        win = agg['total_win'] or Decimal('0')
        return {
            'total_bet': bet,
            'total_win': win,
            'profit_loss': win - bet,
            'rounds': agg['rounds'] or 0,
        }


class CallbackLogRepository:
    @staticmethod
    def record(
        *,
        serial_number: str | None,
        member_account: str | None,
        game_uid: str | None,
        raw_payload: str | None,
        decrypted_payload: dict | None,
        result: str,
        message: str | None = None,
    ) -> GameCallbackLog:
        return GameCallbackLog.objects.create(
            serial_number=serial_number,
            member_account=member_account,
            game_uid=game_uid,
            raw_payload=(raw_payload or '')[:65535] if raw_payload else None,
            decrypted_payload=decrypted_payload,
            result=result,
            message=(message or '')[:255] if message else None,
        )


class WalletRepository:
    @staticmethod
    def lock(user_id: int) -> Wallet:
        """SELECT ... FOR UPDATE the wallet row for serialized settlement."""
        return Wallet.objects.select_for_update().get(user_id=user_id)

    @staticmethod
    def get(user_id: int) -> Wallet | None:
        return Wallet.objects.filter(user_id=user_id).first()


class GameSettingsRepository:
    @staticmethod
    def is_games_enabled() -> bool:
        """Global games master switch (legacy GAME_STATUS). Defaults to True."""
        row = PlatformSetting.objects.filter(setting_key=GAME_STATUS_KEY).first()
        if row is None:
            return True
        value = row.setting_value
        if isinstance(value, bool):
            return value
        if isinstance(value, dict):
            return bool(value.get('enabled', True))
        if isinstance(value, str):
            return value.lower() not in ('false', '0', 'off', 'no')
        return bool(value)

    @staticmethod
    def set_games_enabled(enabled: bool) -> None:
        PlatformSetting.objects.update_or_create(
            setting_key=GAME_STATUS_KEY,
            defaults={'setting_value': {'enabled': bool(enabled)}},
        )
