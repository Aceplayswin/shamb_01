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
    GameCategory,
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

_CATEGORY_FLAG_CACHE_KEY = 'game_category_flags_v1'
_CATEGORY_FLAG_CACHE_TTL = 300


def _category_flag_slugs(field: str, fallback: frozenset) -> frozenset:
    """Slugs of categories whose `field` flag is on, read from game_categories.

    Categories are admin-managed, so which verticals count as sports or settle
    late is data rather than a constant. The hardcoded set is kept as a fallback
    for the window before the table is seeded (and if the query fails): an empty
    result here would silently misreport settlement, so we never treat "no rows"
    as "no sports categories".
    """
    cached = cache.get(_CATEGORY_FLAG_CACHE_KEY)
    if cached is None:
        try:
            rows = list(
                GameCategory.objects.values_list('slug', 'is_sports', 'is_delayed_settlement')
            )
        except Exception:  # table not migrated yet — fall back to the constants
            return fallback
        cached = {
            'is_sports': frozenset(s for s, sp, _ in rows if sp),
            'is_delayed_settlement': frozenset(s for s, _, dl in rows if dl),
        }
        cache.set(_CATEGORY_FLAG_CACHE_KEY, cached, _CATEGORY_FLAG_CACHE_TTL)
    return cached.get(field) or fallback


def invalidate_category_cache() -> None:
    """Drop the cached category flags after an admin edits a category."""
    cache.delete(_CATEGORY_FLAG_CACHE_KEY)


def delayed_settlement_slugs() -> frozenset:
    return _category_flag_slugs('is_delayed_settlement', DELAYED_SETTLEMENT_CATEGORIES)


def sports_category_slugs() -> frozenset:
    return _category_flag_slugs(
        'is_sports',
        frozenset({Game.Category.SPORTS, Game.Category.VIRTUAL_SPORTS}),
    )


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
        return bool(game and game.category in delayed_settlement_slugs())

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
        search: str | None = None,
    ):
        """Filtered bet-history queryset. Both the page of rows and the summary
        totals are built from this, so the headline figures always describe
        exactly the rows the admin is looking at."""
        qs = GameSessionRepository._played(
            GameSession.objects.select_related('game', 'user')
        )
        if user_id:
            qs = qs.filter(user_id=user_id)
        if search:
            # Same fields the admin table searches on-page, so falling back to
            # the server widens the result set without changing its meaning.
            term = search.strip()
            if term:
                qs = qs.filter(
                    Q(user__username__icontains=term)
                    | Q(user__full_name__icontains=term)
                    | Q(game_name__icontains=term)
                    | Q(session_uid__icontains=term)
                )
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

    @staticmethod
    def payout_only_counts(session_ids: list[int]) -> dict[int, int]:
        """Legacy payout-only rows per session, keyed by session id.

        ``rounds_count`` counts callbacks, so a session recorded before
        settlement merged a payout onto its stake counts one wager twice. The
        drill-down pairs those rows back together, and subtracting this count
        keeps the listing's Rounds column agreeing with the rows it opens.
        Sessions settled since the merge landed have none of these and are
        unaffected.
        """
        if not session_ids:
            return {}
        rows = GameRound.objects.filter(
            session_id__in=session_ids, game_round__isnull=False
        ).values_list('session_id', 'game_round', 'bet_amount', 'win_amount')

        # Pair within a session: a payout only double-counts when a stake on the
        # same round sits in the same session. A stakeless payout (whose stake
        # was never recorded) stays its own row in the drill-down, and a round
        # id repeated across two sessions must not pair across them.
        stakes: dict[tuple[int, str], int] = {}
        payouts: dict[tuple[int, str], int] = {}
        for session_id, game_round, bet, win in rows:
            key = (session_id, game_round)
            if bet > 0 and win <= 0:
                stakes[key] = stakes.get(key, 0) + 1
            elif bet <= 0 and win > 0:
                payouts[key] = payouts.get(key, 0) + 1

        counts: dict[int, int] = {}
        for key, payout_count in payouts.items():
            pairs = min(payout_count, stakes.get(key, 0))
            if pairs:
                counts[key[0]] = counts.get(key[0], 0) + pairs
        return counts

    @staticmethod
    def first_balances(session_ids: list[int]) -> dict[int, Decimal]:
        """Wallet balance each session started from, keyed by session id.

        The session row only keeps ``last_balance`` (after its latest round), so
        the opening balance has to come from the earliest round that recorded
        one. Fetched for a whole page in a single query — one lookup per row
        would put a query inside the bet-history loop.
        """
        if not session_ids:
            return {}
        rows = (
            GameRound.objects.filter(
                session_id__in=session_ids, balance_before__isnull=False
            )
            .order_by('session_id', 'created_at', 'id')
            .values_list('session_id', 'balance_before')
        )
        first: dict[int, Decimal] = {}
        for session_id, balance in rows:
            first.setdefault(session_id, balance)
        return first


class GameRoundRepository:
    @staticmethod
    def exists(serial_number: str) -> bool:
        """Whether this callback has already been recorded.

        Checks both columns: once a delayed-settlement round is settled its
        stake callback's number lives in ``stake_serial``, and a redelivery of
        that stake must still be seen as a duplicate.
        """
        return GameRound.objects.filter(
            Q(serial_number=serial_number) | Q(stake_serial=serial_number)
        ).exists()

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
    def lock_unpaid_stakes(
        user_id: int,
        game_round: str | None,
        provider_id: int | None = None,
        game_uid: str | None = None,
        max_age_minutes: int = 1440,
    ) -> list[GameRound]:
        """Lock stakes a payout can still be folded into, including SETTLED ones.

        :meth:`lock_open_stakes` only finds rounds left PENDING, which happens
        for a provider we know settles late. A provider outside that set sends
        the same two callbacks (stake, then payout) but its stake was written
        SETTLED, so the payout has nothing to merge onto and lands as its own
        "bet 0 / win N" row — one wager showing as two rows in bet history.

        This matches the stake regardless of settle_status, restricted to rows
        that took a stake and have not been paid yet (``win_amount`` 0 and no
        ``stake_serial``, which together mean no payout has been merged in) and
        to a recent window so an old losing round is never revived by a later
        round id collision. Rows are locked FOR UPDATE; call inside a
        transaction.
        """
        if not game_round:
            return []
        qs = GameRound.objects.filter(
            user_id=user_id,
            game_round=game_round,
            bet_amount__gt=0,
            win_amount__lte=0,
            stake_serial__isnull=True,
            created_at__gte=timezone.now() - timedelta(minutes=max_age_minutes),
        )
        if provider_id is not None:
            qs = qs.filter(game__provider_id=provider_id)
        elif game_uid:
            qs = qs.filter(game_uid=game_uid)
        return list(qs.select_for_update())

    @staticmethod
    def settle_with_payout(
        round_row: GameRound,
        win_amount,
        serial_number: str,
        balance_after,
        provider_timestamp: str | None = None,
    ) -> GameRound:
        """Fold a result callback's payout into the stake row it resolves.

        A delayed-settlement provider reports the stake and the result as two
        callbacks with two serial numbers. Recording the result as its own row
        would leave a phantom "bet 0 / win N" round — a payout with no stake —
        and make the round's profit_loss the gross payout instead of the real
        net. Instead the payout lands on the stake it belongs to, so one bet is
        one row: bet 300 / win 262 / net -38.

        ``serial_number`` stays the idempotency key: the result callback's
        number is recorded on the row so a redelivery of it is still caught by
        the unique index, and the stake's own number moves to ``stake_serial``.
        """
        round_row.stake_serial = round_row.serial_number
        round_row.serial_number = serial_number
        round_row.win_amount = win_amount
        round_row.balance_after = balance_after
        round_row.settle_status = GameRound.SettleStatus.SETTLED
        round_row.settled_at = timezone.now()
        if provider_timestamp:
            round_row.provider_timestamp = provider_timestamp
        round_row.save(update_fields=[
            'stake_serial', 'serial_number', 'win_amount', 'balance_after',
            'settle_status', 'settled_at', 'provider_timestamp',
        ])
        return round_row

    @staticmethod
    def slip_stake_candidates(
        user_id: int,
        references: set,
        provider_id: int | None = None,
        game_uid: str | None = None,
    ) -> list[GameRound]:
        """Stakes a sportsbook bet-slip settlement may resolve.

        Two sets, both scoped to the sending provider like
        :meth:`lock_open_stakes`: every stake whose provider round id is one of
        the settlement's identifiers (round, bet slip or bet id) in *any* state
        — so a slip already settled is recognised, and a stake the stale sweep
        closed can still be paid — plus the player's stakes on this provider
        that are still pending, whose own callbacks may name the provider bet
        even when the round id does not.

        Two queries rather than one OR, so each can use its own index; and a
        plain read, because a FOR UPDATE here would lock every row scanned for
        the player. The caller locks only the stakes it pairs
        (:meth:`lock_by_ids`).
        """
        def scoped(qs):
            qs = qs.filter(user_id=user_id, bet_amount__gt=0)
            if provider_id is not None:
                return qs.filter(game__provider_id=provider_id)
            if game_uid:
                return qs.filter(game_uid=game_uid)
            return qs

        rows = {
            r.id: r
            for r in scoped(GameRound.objects.filter(
                settle_status=GameRound.SettleStatus.PENDING
            ))
        }
        refs = [r for r in references if r]
        if refs:
            rows.update(
                (r.id, r) for r in scoped(GameRound.objects.filter(game_round__in=refs))
            )
        return [rows[round_id] for round_id in sorted(rows)]

    @staticmethod
    def lock_by_ids(round_ids) -> dict[int, GameRound]:
        """SELECT ... FOR UPDATE rounds by primary key; call inside a transaction."""
        return {
            r.id: r
            for r in GameRound.objects.filter(id__in=list(round_ids))
            .select_for_update()
            .order_by('id')
        }

    @staticmethod
    def settle_slip_stake(
        round_row: GameRound,
        win_amount,
        balance_after,
        serial_number: str | None = None,
        provider_timestamp: str | None = None,
    ) -> GameRound:
        """Record one stake's share of a bet-slip result and mark it settled.

        ``serial_number`` is given for one stake per settlement callback and is
        folded in exactly as :meth:`settle_with_payout` does — the callback's
        number takes ``serial_number`` (unique) and the stake's own moves to
        ``stake_serial`` — so a redelivered settlement is caught as a duplicate.
        """
        fields = ['win_amount', 'balance_after', 'settle_status', 'settled_at']
        if serial_number:
            round_row.stake_serial = round_row.serial_number
            round_row.serial_number = serial_number
            fields += ['stake_serial', 'serial_number']
        if provider_timestamp:
            round_row.provider_timestamp = provider_timestamp
            fields.append('provider_timestamp')
        round_row.win_amount = win_amount
        round_row.balance_after = balance_after
        round_row.settle_status = GameRound.SettleStatus.SETTLED
        round_row.settled_at = timezone.now()
        round_row.save(update_fields=fields)
        return round_row

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
    def list_for_session(session_id: int, limit: int | None = 200) -> list[GameRound]:
        qs = (
            GameRound.objects.filter(session_id=session_id)
            .select_related('game', 'game__provider', 'session', 'session__game', 'session__game__provider')
            .order_by('-created_at')
        )
        if limit is not None:
            qs = qs[:limit]
        return list(qs)

    @staticmethod
    def recent_big_wins(limit: int, min_win: Decimal) -> list[GameRound]:
        """Recently settled winning rounds for the public big-wins feed."""
        return list(
            GameRound.objects.filter(
                win_amount__gte=min_win,
                settle_status=GameRound.SettleStatus.SETTLED,
            )
            .select_related(
                'user', 'game', 'game__provider',
                'session', 'session__game', 'session__game__provider',
            )
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

    @staticmethod
    def heartbeats(since=None):
        """Callbacks acked as balance-sync pings, oldest first (streamed)."""
        qs = GameCallbackLog.objects.filter(result=GameCallbackLog.Result.HEARTBEAT)
        if since is not None:
            qs = qs.filter(created_at__gte=since)
        return qs.order_by('id').iterator()

    @staticmethod
    def latest_result(serial_number: str) -> str | None:
        return (
            GameCallbackLog.objects.filter(serial_number=serial_number)
            .order_by('-id')
            .values_list('result', flat=True)
            .first()
        )

    @staticmethod
    def first_payloads(serial_numbers) -> dict:
        """Decrypted payload first logged under each serial number.

        A stake's callback is where a sportsbook names the bet it placed; the
        ``GameRound`` row only keeps the totals. One indexed query per batch.
        """
        serials = [s for s in serial_numbers if s]
        if not serials:
            return {}
        rows = (
            GameCallbackLog.objects.filter(
                serial_number__in=serials, decrypted_payload__isnull=False
            )
            .order_by('id')
            .values_list('serial_number', 'decrypted_payload')
        )
        payloads: dict = {}
        for serial, payload in rows:
            payloads.setdefault(serial, payload)
        return payloads


class WalletRepository:
    @staticmethod
    def lock(user_id: int) -> Wallet:
        """SELECT ... FOR UPDATE the wallet row for serialized settlement."""
        return Wallet.objects.select_for_update().get(user_id=user_id)

    @staticmethod
    def get(user_id: int) -> Wallet | None:
        return Wallet.objects.filter(user_id=user_id).first()

    @staticmethod
    def playable(wallet: Wallet | None) -> Decimal:
        """What the player can actually stake: real money plus bonus credit.

        Bonus money is spendable but not withdrawable, so this is the figure
        game providers are shown and bet against — unlike the withdrawable
        balance, which is main_balance alone (see core.services.get_wallet).
        Holds against pending withdrawals are excluded: that money is spoken
        for.
        """
        if wallet is None:
            return Decimal('0')
        playable = (
            wallet.main_balance + wallet.bonus_balance - wallet.locked_balance
        )
        return playable if playable > Decimal('0') else Decimal('0')


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
