"""Repository layer for the gaming module.

Encapsulates all ORM/data-access for games, sessions, rounds, and the global
game toggle so the service layer stays focused on business logic and the query
shapes (select_related, indexes, locking) live in one place. Keeping data access
here also makes the services trivially mockable in tests.
"""

from __future__ import annotations

from decimal import Decimal

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from core.models import (
    Game,
    GameCallbackLog,
    GameProvider,
    GameRound,
    GameSession,
    PlatformSetting,
    Wallet,
)

# Platform setting key that mirrors the legacy tblservices.GAME_STATUS master
# on/off switch for all game launches.
GAME_STATUS_KEY = 'game_status'


# Every inbound aggregator callback needs the set of provider keys/prefixes to
# identify its sender. That is effectively static config on the hottest path in
# the system, so it is cached and invalidated whenever a provider is written
# (see `invalidate_provider_cache`, called from the admin provider endpoints).
PROVIDER_CREDENTIAL_CACHE_KEY = 'game:provider_credentials'
PROVIDER_CREDENTIAL_CACHE_TTL = 300


def _provider_credential_cache() -> dict:
    cached = cache.get(PROVIDER_CREDENTIAL_CACHE_KEY)
    if cached is not None:
        return cached
    rows = GameProvider.objects.values_list('aes_secret_key', 'player_prefix')
    credentials = {
        'secrets': [secret for secret, _ in rows if secret],
        'prefixes': [prefix for _, prefix in rows if prefix],
    }
    cache.set(
        PROVIDER_CREDENTIAL_CACHE_KEY, credentials, PROVIDER_CREDENTIAL_CACHE_TTL
    )
    return credentials


def invalidate_provider_cache() -> None:
    """Drop the cached provider credentials after an admin edit."""
    cache.delete(PROVIDER_CREDENTIAL_CACHE_KEY)


# Game categories whose providers typically settle long after the stake is
# taken (a match/draw has to finish first). Used as the default when a provider
# has not been explicitly flagged `delayed_settlement` in the admin panel.
DELAYED_SETTLEMENT_CATEGORIES = frozenset({
    Game.Category.SPORTS,
    Game.Category.VIRTUAL_SPORTS,
    Game.Category.FANTASY,
    Game.Category.LOTTERY,
})


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
        return Game.objects.select_related('provider').filter(game_uid=game_uid).first()

    @staticmethod
    def provider_overrides(game: Game | None) -> dict:
        """Per-provider aggregator credential overrides for this game's vendor.

        Returns ``{}`` for games with no provider or a provider that rides the
        platform-wide account, so the caller transparently gets the env config.
        """
        provider = getattr(game, 'provider', None)
        if provider is None:
            return {}
        return {
            'agency_uid': provider.agency_uid,
            'aes_secret_key': provider.aes_secret_key,
            'server_url': provider.server_url,
            'launch_path': provider.launch_path,
            'player_prefix': provider.player_prefix,
            'callback_path': provider.callback_path,
            'currency_code': provider.currency_code,
        }

    @staticmethod
    def settles_late(game: Game | None) -> bool:
        """Whether a stake on this game is resolved by a later result callback.

        An explicit provider flag wins; otherwise the game's category decides
        (sports/lottery/fantasy settle late, slots settle in the same call).
        """
        provider = getattr(game, 'provider', None)
        if provider is not None and provider.delayed_settlement:
            return True
        return bool(game and game.category in DELAYED_SETTLEMENT_CATEGORIES)

    @staticmethod
    def provider_secrets() -> list[str]:
        """AES keys of every separately-integrated provider (callback decrypt)."""
        return _provider_credential_cache()['secrets']

    @staticmethod
    def provider_prefixes() -> list[str]:
        """member_account prefixes of every separately-integrated provider."""
        return _provider_credential_cache()['prefixes']

    @staticmethod
    def get_by_id(game_id: int) -> Game | None:
        return Game.objects.filter(id=game_id).first()

    @staticmethod
    def increment_play_count(game_id: int) -> None:
        Game.objects.filter(id=game_id).update(play_count=F('play_count') + 1)


# How far back a callback whose game_uid matches no session may still be folded
# into the player's most recent session. Lobby products (Ezugi, Microgaming)
# launch a lobby UID but report rounds under the specific table's UID.
LOBBY_ATTRIBUTION_WINDOW = timedelta(hours=12)


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
    def get_unplayed_for_user_game(user_id: int, game_uid: str) -> GameSession | None:
        """A previous launch of this game the player never actually bet in.

        Re-launching reuses it instead of piling up empty rows in bet history.
        """
        return (
            GameSession.objects.filter(
                user_id=user_id, game_uid=game_uid, rounds_count=0, total_bet=0
            )
            .order_by('-created_at')
            .first()
        )

    @staticmethod
    def create(**fields) -> GameSession:
        return GameSession.objects.create(**fields)

    @staticmethod
    def latest_for_settlement(
        user_id: int, game_uid: str, provider_id: int | None = None
    ) -> GameSession | None:
        """Most recent session to attribute an incoming round to.

        Exact user+game_uid match first (the normal case). Failing that — a
        lobby launch, where the aggregator reports the table's UID rather than
        the lobby's — the player's most recent recent session takes the round,
        so lobby play lands in bet history with real amounts instead of an
        orphaned zero row.

        The fallback is scoped to the *same provider* where we can identify it,
        so an unmatched round is never folded into an unrelated vendor's game;
        without that a stray callback could inflate whichever session the player
        happened to open last.
        """
        exact = (
            GameSession.objects.filter(user_id=user_id, game_uid=game_uid)
            .order_by('-created_at')
            .first()
        )
        if exact:
            return exact

        qs = GameSession.objects.filter(
            user_id=user_id,
            created_at__gte=timezone.now() - LOBBY_ATTRIBUTION_WINDOW,
        )
        if provider_id is not None:
            qs = qs.filter(game__provider_id=provider_id)
        return qs.order_by('-created_at').first()

    @staticmethod
    def _played(qs):
        """Sessions the player actually bet in — a launch alone is not history."""
        return qs.filter(Q(rounds_count__gt=0) | Q(total_bet__gt=0))

    @staticmethod
    def list_for_user(user_id: int, limit: int, offset: int) -> list[GameSession]:
        return list(
            GameSessionRepository._played(
                GameSession.objects.filter(user_id=user_id)
            )
            .select_related('game')
            .order_by('-updated_at')[offset : offset + limit]
        )

    @staticmethod
    def count_for_user(user_id: int) -> int:
        return GameSessionRepository._played(
            GameSession.objects.filter(user_id=user_id)
        ).count()

    @staticmethod
    def get_for_user(user_id: int, session_uid: str) -> GameSession | None:
        return (
            GameSession.objects.select_related('game')
            .filter(user_id=user_id, session_uid=session_uid)
            .first()
        )

    @staticmethod
    def admin_queryset(
        user_id: int | None = None,
        status: str | None = None,
        game_uid: str | None = None,
        date_from=None,
        date_to=None,
    ):
        """Filtered bet-history queryset. Both the page of rows and the summary
        totals are built from this, so the headline figures always describe
        exactly the rows the admin is looking at."""
        qs = GameSessionRepository._played(
            GameSession.objects.select_related('game', 'user')
        )
        if user_id:
            qs = qs.filter(user_id=user_id)
        if status:
            qs = qs.filter(status=status)
        if game_uid:
            qs = qs.filter(game_uid=game_uid)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs

    @staticmethod
    def page(qs, limit: int, offset: int) -> list[GameSession]:
        return list(qs.order_by('-updated_at')[offset : offset + limit])


class GameRoundRepository:
    @staticmethod
    def exists(serial_number: str) -> bool:
        return GameRound.objects.filter(serial_number=serial_number).exists()

    @staticmethod
    def create(**fields) -> GameRound:
        return GameRound.objects.create(**fields)

    @staticmethod
    def lock_open_stakes(
        user_id: int,
        game_round: str | None,
        provider_id: int | None = None,
        game_uid: str | None = None,
    ) -> list[GameRound]:
        """Lock and return the unresolved stakes a result callback settles.

        Keyed on the provider's ``game_round`` (the match/draw id), which is how
        a sportsbook ties a payout back to the stake it belongs to. Round ids
        are only unique *within* a vendor, so the match is additionally scoped
        to the sending provider — otherwise a lottery draw numbered "1001" would
        resolve a football bet on round "1001".

        Rows are locked FOR UPDATE so two callbacks racing on the same round
        cannot both resolve it and double-decrement the session counter. Must be
        called inside a transaction.
        """
        if not game_round:
            return []
        qs = GameRound.objects.filter(
            user_id=user_id,
            game_round=game_round,
            settle_status=GameRound.SettleStatus.PENDING,
        )
        if provider_id is not None:
            qs = qs.filter(game__provider_id=provider_id)
        elif game_uid:
            # Unknown game (not in our catalog): fall back to the narrowest
            # scope available rather than matching every provider's round ids.
            qs = qs.filter(game_uid=game_uid)
        return list(qs.select_for_update())

    @staticmethod
    def mark_settled(round_ids: list[int]) -> int:
        if not round_ids:
            return 0
        return GameRound.objects.filter(id__in=round_ids).update(
            settle_status=GameRound.SettleStatus.SETTLED,
            settled_at=timezone.now(),
        )

    @staticmethod
    def lock_stale_pending(cutoff, limit: int = 500) -> list[GameRound]:
        """Stakes still unresolved past the cutoff, locked for settlement.

        Some vendors never send a resolvable result for a losing bet, which
        would otherwise leave the round Pending indefinitely. Must be called
        inside a transaction.
        """
        return list(
            GameRound.objects.filter(
                settle_status=GameRound.SettleStatus.PENDING,
                created_at__lt=cutoff,
            ).select_for_update()[:limit]
        )

    @staticmethod
    def list_for_session(session_id: int, limit: int = 200) -> list[GameRound]:
        return list(
            GameRound.objects.filter(session_id=session_id)
            .select_related('game')
            .order_by('-created_at')[:limit]
        )

    @staticmethod
    def recent_big_wins(limit: int, min_win: Decimal) -> list[GameRound]:
        """Recently settled winning rounds for the public big-wins feed."""
        return list(
            GameRound.objects.filter(
                win_amount__gte=min_win,
                settle_status=GameRound.SettleStatus.SETTLED,
            )
            .select_related('user', 'game')
            .order_by('-created_at')[:limit]
        )

    @staticmethod
    def user_pnl(user_id: int) -> dict:
        agg = GameRound.objects.filter(user_id=user_id).aggregate(
            total_bet=Sum('bet_amount'),
            total_win=Sum('win_amount'),
            rounds=Count('id'),
        )
        bet = agg['total_bet'] or Decimal('0')
        win = agg['total_win'] or Decimal('0')
        pending = GameRound.objects.filter(
            user_id=user_id, settle_status=GameRound.SettleStatus.PENDING
        ).aggregate(amount=Sum('bet_amount'), rounds=Count('id'))
        return {
            'total_bet': bet,
            'total_win': win,
            'profit_loss': win - bet,
            'rounds': agg['rounds'] or 0,
            'pending_amount': pending['amount'] or Decimal('0'),
            'pending_rounds': pending['rounds'] or 0,
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
