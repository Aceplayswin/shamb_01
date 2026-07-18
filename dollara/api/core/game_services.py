"""Gaming-module business logic: launch, sessions, callback settlement, reporting.

This is the clean-architecture core of the gaming module. It orchestrates:

- **Launch**: validate the user/wallet/game, ask the aggregator for a launch URL
  (via the provider service layer), and open/refresh a :class:`GameSession`.
- **Callback settlement**: decrypt + validate an aggregator bet/win callback and
  apply it to the wallet *idempotently* and *transaction-safely* (row lock +
  unique ``serial_number``), updating session + wallet + transaction ledger.
- **Reporting**: per-user play history and P&L.

All wire-protocol / crypto concerns live in ``services/game_provider.py``; all
data access lives in ``core/repositories.py``. This module never talks HTTP or
SQL directly beyond the repositories and the ORM transaction helpers.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

from core import game_logging
from core.game_schemas import CallbackPayload, LaunchRequest
from core.models import (
    GameRound,
    GameSession,
    Transaction,
    User,
    Wallet,
)
from core.repositories import (
    CallbackLogRepository,
    GameRepository,
    GameRoundRepository,
    GameSessionRepository,
    GameSettingsRepository,
    WalletRepository,
)
from services import game_provider
from tenants.state import tenant_atomic

ZERO = Decimal('0')


class GameError(Exception):
    """Domain error with a machine-readable ``code`` for API status mapping."""

    def __init__(self, code: str, message: str = ''):
        self.code = code
        super().__init__(message or code)


def _min_launch_balance() -> Decimal:
    return Decimal(str(settings.GAME_MIN_LAUNCH_BALANCE))


def _new_session_uid() -> str:
    # Opaque, collision-resistant public reference (also used as order id base).
    return f'GS{uuid.uuid4().hex[:24]}'


# --------------------------------------------------------------------------- #
# Launch
# --------------------------------------------------------------------------- #

def launch_game(user_id: int, body: dict) -> dict:
    """Validate, request a launch URL from the aggregator, and open a session.

    Raises :class:`GameError` with a code from the set
    {auth_error, account_error, game_off, invalid_params, game_not_found,
    balance_error, server_error}.
    """
    req = LaunchRequest.parse(body)
    game_logging.launch_attempt(user_id, req.game_uid, req.game_name)

    try:
        user = User.objects.filter(id=user_id, role=User.Role.USER).first()
        if not user:
            raise GameError('auth_error', 'User not found')
        if user.account_status != User.AccountStatus.ACTIVE:
            raise GameError('account_error', 'Account is not active')

        if not GameSettingsRepository.is_games_enabled():
            raise GameError('game_off', 'Games are temporarily disabled')

        game = GameRepository.get_active_by_uid(req.game_uid)
        if not game:
            raise GameError('game_not_found', 'Game not available')

        wallet = WalletRepository.get(user_id)
        if not wallet:
            raise GameError('balance_error', 'Wallet not found')
        available = wallet.main_balance - wallet.locked_balance
        if available < _min_launch_balance():
            raise GameError(
                'balance_error',
                f'Minimum balance of {_min_launch_balance()} required to play',
            )

        # Games from a separately-integrated vendor (its own agency account and
        # keys — e.g. a standalone lottery provider) launch against that
        # vendor's config; everything else rides the platform-wide account.
        overrides = GameRepository.provider_overrides(game)

        try:
            launch_url = game_provider.request_launch_url(
                user_id=user_id,
                game_uid=req.game_uid,
                credit_amount=f'{available:.2f}',
                language=req.language,
                platform=req.platform,
                overrides=overrides,
            )
        except (game_provider.ProviderConfigError, game_provider.ProviderError) as exc:
            # Name the vendor in the error. A game from a separately-integrated
            # provider (lottery, a second aggregator) failing on incomplete
            # credentials should say so, not read as a generic server fault.
            provider_name = getattr(getattr(game, 'provider', None), 'name', None)
            detail = f'{provider_name}: {exc}' if provider_name else str(exc)
            raise GameError('server_error', detail) from exc

        member_account = game_provider.build_member_account(user_id, overrides)
        game_name = req.game_name or game.name

        with tenant_atomic():
            # Re-entering a game the player never bet in reuses that launch row
            # rather than adding another empty record to their bet history.
            session = GameSessionRepository.get_unplayed_for_user_game(
                user_id, req.game_uid
            )
            if session:
                session.game_name = game_name
                session.member_account = member_account
                session.launch_url = launch_url
                session.currency = wallet.currency
                session.save(update_fields=[
                    'game_name', 'member_account', 'launch_url', 'currency',
                    'updated_at',
                ])
            else:
                session = GameSessionRepository.create(
                    session_uid=_new_session_uid(),
                    user_id=user_id,
                    game_id=game.id,
                    game_uid=req.game_uid,
                    game_name=game_name,
                    member_account=member_account,
                    launch_url=launch_url,
                    currency=wallet.currency,
                    status=GameSession.Status.WAIT,
                )
            GameRepository.increment_play_count(game.id)
    except GameError as exc:
        # The launch was interrupted before the game could open — record the
        # exact reason (bad account, no balance, aggregator unreachable, …).
        game_logging.launch_failed(user_id, req.game_uid, exc.code, str(exc), req.game_name)
        raise

    game_logging.launch_success(
        user_id, req.game_uid, session.session_uid, game_name, launch_url,
    )
    return {
        'status_code': 'success',
        'data': {
            'game_url': launch_url,
            'session_uid': session.session_uid,
            'game_name': game_name,
            'game_uid': req.game_uid,
        },
    }


# --------------------------------------------------------------------------- #
# Callback settlement (idempotent + transaction-safe)
# --------------------------------------------------------------------------- #

@dataclass
class SettlementResult:
    result: str  # 'settled' | 'duplicate' | 'heartbeat'
    credit_amount: Decimal


def process_callback(envelope: dict, raw_body: str | None = None) -> dict:
    """Decrypt, validate, and settle an aggregator bet/win callback.

    Returns the aggregator-shaped encrypted ack dict. Designed so that:

    - **Idempotent**: a repeated ``serial_number`` is detected (unique DB index
      + pre-check) and re-acks without double-settling the wallet.
    - **Transaction-safe**: the wallet is row-locked and all writes (round,
      wallet, session, ledger transaction) commit atomically or not at all.
    - **Heartbeat-aware**: a zero bet+win callback just returns the balance.

    Crypto/parse failures are logged and surfaced as a ``GameError`` so the view
    can return a provider-appropriate error envelope.
    """
    # 1. Decrypt the envelope -> plain payload. Any integrated provider could
    #    be the sender, so every configured key is a candidate; the one that
    #    works also encrypts the ack we send back.
    try:
        plain, secret = game_provider.parse_callback(
            envelope, tuple(GameRepository.provider_secrets())
        )
    except game_provider.ProviderError as exc:
        CallbackLogRepository.record(
            serial_number=None, member_account=None, game_uid=None,
            raw_payload=raw_body, decrypted_payload=None,
            result='error', message=str(exc),
        )
        game_logging.decrypt_error(str(exc))
        raise GameError('decrypt_error', str(exc)) from exc

    # 2. Validate the payload shape.
    try:
        cb = CallbackPayload.parse(plain)
    except ValueError as exc:
        CallbackLogRepository.record(
            serial_number=plain.get('serial_number'),
            member_account=plain.get('member_account'),
            game_uid=plain.get('game_uid'),
            raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message=str(exc),
        )
        game_logging.rejected(
            plain.get('serial_number'), plain.get('member_account'),
            plain.get('game_uid'), str(exc),
        )
        raise GameError('invalid_params', str(exc)) from exc

    game_logging.callback_received(cb.serial_number, cb.member_account, cb.game_uid)

    user_id_str = game_provider.strip_member_account(
        cb.member_account, tuple(GameRepository.provider_prefixes())
    )
    try:
        user_id = int(user_id_str)
    except (TypeError, ValueError):
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message='Unresolvable member_account',
        )
        game_logging.rejected(
            cb.serial_number, cb.member_account, cb.game_uid,
            'Unresolvable member_account',
        )
        raise GameError('auth_error', 'Unknown member_account')

    # 3. Zero-value callback. If it names a round the player has an unresolved
    #    stake on, it is that bet losing — resolve it so bet history stops
    #    saying "Pending". Otherwise it is a plain balance-sync ping.
    if cb.is_heartbeat:
        wallet = WalletRepository.get(user_id)
        balance = wallet.main_balance if wallet else ZERO
        sender = GameRepository.get_by_uid(cb.game_uid)
        resolved = _resolve_open_stakes(
            user_id, cb.game_round,
            provider_id=sender.provider_id if sender else None,
            game_uid=cb.game_uid,
        )
        if resolved:
            CallbackLogRepository.record(
                serial_number=cb.serial_number, member_account=cb.member_account,
                game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
                result='settled', message=f'Resolved {resolved} pending stake(s) as lost',
            )
        else:
            CallbackLogRepository.record(
                serial_number=cb.serial_number, member_account=cb.member_account,
                game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
                result='heartbeat', message='Balance sync',
            )
            game_logging.heartbeat(user_id, cb.game_uid, cb.serial_number, balance)
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)

    # 4. Fast idempotency pre-check (avoids opening a txn for known duplicates).
    if GameRoundRepository.exists(cb.serial_number):
        wallet = WalletRepository.get(user_id)
        balance = wallet.main_balance if wallet else ZERO
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='duplicate', message='Duplicate serial_number (pre-check)',
        )
        game_logging.duplicate(user_id, cb.game_uid, cb.serial_number, 'pre-check')
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)

    # 5. Settle atomically under a wallet row lock.
    try:
        settlement = _settle(user_id, cb)
    except _DuplicateRound:
        # Lost a race on the unique serial_number — treat as idempotent success.
        wallet = WalletRepository.get(user_id)
        balance = wallet.main_balance if wallet else ZERO
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='duplicate', message='Duplicate serial_number (race)',
        )
        game_logging.duplicate(user_id, cb.game_uid, cb.serial_number, 'race')
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)
    except Wallet.DoesNotExist:
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message='Wallet not found',
        )
        game_logging.rejected(
            cb.serial_number, cb.member_account, cb.game_uid, 'Wallet not found',
        )
        raise GameError('auth_error', 'Wallet not found')

    CallbackLogRepository.record(
        serial_number=cb.serial_number, member_account=cb.member_account,
        game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
        result='settled',
        message=f'bet={cb.bet_amount} win={cb.win_amount} bal={settlement.credit_amount}',
    )
    game_logging.settled(
        user_id, cb.game_uid, cb.serial_number,
        cb.bet_amount, cb.win_amount, settlement.credit_amount,
    )
    return game_provider.build_ack(f'{settlement.credit_amount:.2f}', cb.timestamp, secret)


class _DuplicateRound(Exception):
    pass


def _session_status(session: GameSession) -> str:
    """Bet-history status for a session.

    A session with stakes the provider has not resolved yet stays WAIT — showing
    a loss before the official result is in is exactly the sportsbook bug this
    guards against.
    """
    if session.rounds_count == 0 or session.pending_rounds > 0:
        return GameSession.Status.WAIT
    return (
        GameSession.Status.PROFIT
        if session.profit_loss >= ZERO
        else GameSession.Status.LOSS
    )


def _resolve_open_stakes(
    user_id: int,
    game_round: str | None,
    provider_id: int | None = None,
    game_uid: str | None = None,
) -> int:
    """Mark the player's unresolved stakes on ``game_round`` as settled.

    Called when the provider reports the outcome — a win callback, or a
    zero-value one for a loss. Returns how many rounds were resolved.

    Runs as one transaction over locked rows: marking the rounds settled and
    decrementing each session's pending counter must both happen or neither, or
    a session is left counting stakes that no longer exist and shows "Pending"
    forever. Safe to nest inside an outer transaction (becomes a savepoint).
    """
    with tenant_atomic():
        open_rounds = GameRoundRepository.lock_open_stakes(
            user_id, game_round, provider_id, game_uid
        )
        if not open_rounds:
            return 0

        GameRoundRepository.mark_settled([r.id for r in open_rounds])

        # Roll the resolution up into each affected session's pending counter so
        # its status can move off WAIT.
        per_session: dict[int, int] = {}
        for r in open_rounds:
            if r.session_id:
                per_session[r.session_id] = per_session.get(r.session_id, 0) + 1
        for session_id, count in per_session.items():
            session = GameSession.objects.filter(id=session_id).first()
            if not session:
                continue
            session.pending_rounds = max(0, session.pending_rounds - count)
            session.status = _session_status(session)
            session.save(update_fields=['pending_rounds', 'status', 'updated_at'])
        return len(open_rounds)


def settle_stale_pending_rounds(max_age_hours: int | None = None) -> dict:
    """Force-settle stakes the provider never reported a result for.

    Without this a vendor that simply stops talking about a losing bet leaves
    it Pending forever, with no way out but manual SQL. The stake was already
    debited at bet time, so settling it moves no money — it only stops bet
    history from claiming the result is still coming.

    Run periodically (``manage.py settle_stale_rounds``) or on demand from the
    admin panel. Returns what it resolved.
    """
    hours = max_age_hours or int(settings.GAME_PENDING_STAKE_MAX_HOURS)
    cutoff = timezone.now() - timedelta(hours=hours)

    with tenant_atomic():
        stale = GameRoundRepository.lock_stale_pending(cutoff)
        if not stale:
            return {'settled': 0, 'sessions_updated': 0, 'max_age_hours': hours}

        GameRoundRepository.mark_settled([r.id for r in stale])

        per_session: dict[int, int] = {}
        for r in stale:
            if r.session_id:
                per_session[r.session_id] = per_session.get(r.session_id, 0) + 1
        for session_id, count in per_session.items():
            session = GameSession.objects.filter(id=session_id).first()
            if not session:
                continue
            session.pending_rounds = max(0, session.pending_rounds - count)
            session.status = _session_status(session)
            session.save(update_fields=['pending_rounds', 'status', 'updated_at'])

    game_logging.callback_error(
        f'Force-settled {len(stale)} stake(s) unresolved for over {hours}h'
    )
    return {
        'settled': len(stale),
        'sessions_updated': len(per_session),
        'max_age_hours': hours,
    }


def _settle(user_id: int, cb: CallbackPayload) -> SettlementResult:
    """Apply one bet/win event to wallet + session + ledger atomically."""
    net = cb.win_amount - cb.bet_amount  # +win, -loss
    game = GameRepository.get_by_uid(cb.game_uid)

    # A stake taken by a provider that settles later (sportsbook, lottery) is
    # not a result yet — it is money on an open bet. Recording it as PENDING is
    # what keeps bet history on "Waiting" until the official result lands.
    is_stake_only = cb.bet_amount > ZERO and cb.win_amount == ZERO
    pending = is_stake_only and GameRepository.settles_late(game)

    with tenant_atomic():
        wallet = WalletRepository.lock(user_id)  # SELECT ... FOR UPDATE
        balance_before = wallet.main_balance

        # Create the round first so the unique serial_number guards the wallet
        # write — if this row already exists we abort before moving money.
        try:
            round_row = GameRoundRepository.create(
                user_id=user_id,
                game_id=game.id if game else None,
                game_uid=cb.game_uid,
                game_name=game.name if game else None,
                serial_number=cb.serial_number,
                game_round=cb.game_round,
                settle_status=(
                    GameRound.SettleStatus.PENDING
                    if pending
                    else GameRound.SettleStatus.SETTLED
                ),
                settled_at=None if pending else timezone.now(),
                bet_amount=cb.bet_amount,
                win_amount=cb.win_amount,
                balance_before=balance_before,
                balance_after=balance_before + net,
                currency=cb.currency_code or wallet.currency,
                provider_timestamp=cb.timestamp,
            )
        except IntegrityError as exc:
            raise _DuplicateRound() from exc

        # Wallet: apply net delta to main balance, decrement wagering requirement
        # by the amount wagered (legacy tbl_requiredplay_balance semantics).
        wallet.main_balance = balance_before + net
        new_wagering = wallet.wagering_balance - cb.bet_amount
        wallet.wagering_balance = new_wagering if new_wagering > ZERO else ZERO
        wallet.save(update_fields=['main_balance', 'wagering_balance', 'updated_at'])

        # This callback carrying a win is also the result for any stake still
        # open on the same round — clear those first so the session is re-read
        # below with its pending counter already decremented.
        if not pending:
            _resolve_open_stakes(
                user_id, cb.game_round,
                provider_id=game.provider_id if game else None,
                game_uid=cb.game_uid,
            )

        # Attribute to the latest session for this user+game (creating none here;
        # a callback without a prior launch is still settled and logged).
        session = GameSessionRepository.latest_for_settlement(
            user_id, cb.game_uid, provider_id=game.provider_id if game else None
        )
        if session:
            session.total_bet += cb.bet_amount
            session.total_win += cb.win_amount
            session.profit_loss = session.total_win - session.total_bet
            session.rounds_count += 1
            if pending:
                session.pending_rounds += 1
            session.last_balance = wallet.main_balance
            session.last_played_at = timezone.now()
            session.status = _session_status(session)
            session.save(update_fields=[
                'total_bet', 'total_win', 'profit_loss', 'rounds_count',
                'pending_rounds', 'last_balance', 'last_played_at', 'status',
                'updated_at',
            ])
            if round_row.session_id is None:
                GameRound.objects.filter(id=round_row.id).update(session_id=session.id)

        # Ledger: record the net wallet movement as a bet_settlement transaction.
        if net != ZERO:
            Transaction.objects.create(
                user_id=user_id,
                type=Transaction.TxType.BET_SETTLEMENT,
                amount=abs(net),
                currency=cb.currency_code or wallet.currency,
                status=Transaction.Status.COMPLETED,
                reference_number=cb.serial_number,
                notes=f'{"Win" if net > 0 else "Loss"} on {cb.game_uid} '
                      f'(bet={cb.bet_amount}, win={cb.win_amount})',
            )

        return SettlementResult(result='settled', credit_amount=wallet.main_balance)


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #

def serialize_session(s: GameSession) -> dict:
    """One bet-history row. ``result`` is the player-facing label; a session
    still waiting on the provider reads Pending rather than a premature loss."""
    pending = s.pending_rounds > 0 or s.rounds_count == 0
    return {
        'session_uid': s.session_uid,
        'game_name': s.game_name,
        'game_uid': s.game_uid,
        'category': s.game.category if s.game else None,
        'total_bet': float(s.total_bet),
        'total_win': float(s.total_win),
        'profit_loss': float(s.profit_loss),
        'rounds': s.rounds_count,
        'pending_rounds': s.pending_rounds,
        'status': s.status,
        'result': 'pending' if pending else ('won' if s.profit_loss >= ZERO else 'lost'),
        'settled': not pending,
        'last_balance': float(s.last_balance) if s.last_balance is not None else None,
        'last_played_at': s.last_played_at.isoformat() if s.last_played_at else None,
        'created_at': s.created_at.isoformat(),
    }


def serialize_round(r: GameRound) -> dict:
    """One round inside a session — the drill-down detail behind a history row."""
    net = r.win_amount - r.bet_amount
    is_pending = r.settle_status == GameRound.SettleStatus.PENDING
    return {
        'id': r.id,
        'serial_number': r.serial_number,
        'game_round': r.game_round,
        # The specific table/market actually played, which differs from the
        # session's game for a lobby launch.
        'game_name': r.game_name or (r.game.name if r.game else None),
        'game_uid': r.game_uid,
        'bet_amount': float(r.bet_amount),
        'win_amount': float(r.win_amount),
        'profit_loss': float(net),
        'balance_before': float(r.balance_before) if r.balance_before is not None else None,
        'balance_after': float(r.balance_after) if r.balance_after is not None else None,
        'currency': r.currency,
        'settle_status': r.settle_status,
        'result': 'pending' if is_pending else ('won' if net >= ZERO else 'lost'),
        'settled_at': r.settled_at.isoformat() if r.settled_at else None,
        'created_at': r.created_at.isoformat(),
    }


def get_play_history(user_id: int, limit: int = 40, offset: int = 0) -> dict:
    """Paginated session history for a user (My Games / play records).

    Launch-only sessions (entered a game, never staked) are excluded — they are
    not bets and must not appear as zero-amount history rows.
    """
    sessions = GameSessionRepository.list_for_user(user_id, limit, offset)
    total = GameSessionRepository.count_for_user(user_id)
    records = [serialize_session(s) for s in sessions]
    if offset == 0 and not records:
        status_code = 'no-records-found'
    elif not records:
        status_code = 'no-more'
    else:
        status_code = 'success'
    return {
        'status_code': status_code,
        'records': records,
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def get_session_rounds(user_id: int, session_uid: str) -> dict:
    """Round-by-round detail for one of the player's own sessions."""
    session = GameSessionRepository.get_for_user(user_id, session_uid)
    if not session:
        raise GameError('game_not_found', 'Session not found')
    rounds = GameRoundRepository.list_for_session(session.id)
    return {
        'status_code': 'success' if rounds else 'no-records-found',
        'session': serialize_session(session),
        'rounds': [serialize_round(r) for r in rounds],
    }


def get_user_pnl(user_id: int) -> dict:
    """Aggregate betting profit/loss for a user."""
    pnl = GameRoundRepository.user_pnl(user_id)
    return {
        'total_bet': float(pnl['total_bet']),
        'total_win': float(pnl['total_win']),
        'profit_loss': float(pnl['profit_loss']),
        'rounds': pnl['rounds'],
        # Stakes on bets the provider has not resolved yet — excluded from the
        # win/loss verdict a player sees.
        'pending_amount': float(pnl['pending_amount']),
        'pending_rounds': pnl['pending_rounds'],
    }


def _mask_username(name: str | None) -> str:
    """Public-feed display name: first and last character only (A***h)."""
    clean = (name or 'Player').strip()
    if len(clean) <= 2:
        return f'{clean[:1]}***'
    return f'{clean[0]}***{clean[-1]}'


def get_big_wins(limit: int = 12, min_win: float | None = None) -> list[dict]:
    """Recent large wins across all players, for the public winners feed.

    Names are masked — this is shown to every visitor, signed in or not.
    """
    threshold = Decimal(str(
        min_win if min_win is not None else settings.GAME_BIG_WIN_THRESHOLD
    ))
    return [
        {
            'id': r.id,
            'username': _mask_username(r.user.username or r.user.full_name),
            'game_name': r.game_name or (r.game.name if r.game else 'Casino'),
            'game_uid': r.game_uid,
            'category': r.game.category if r.game else None,
            'thumbnail_url': r.game.thumbnail_url if r.game else None,
            'bet_amount': float(r.bet_amount),
            'win_amount': float(r.win_amount),
            'multiplier': (
                round(float(r.win_amount / r.bet_amount), 2)
                if r.bet_amount > ZERO
                else None
            ),
            'currency': r.currency,
            'created_at': r.created_at.isoformat(),
        }
        for r in GameRoundRepository.recent_big_wins(limit, threshold)
    ]
