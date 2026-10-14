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

import re
import uuid
from dataclasses import dataclass
from datetime import timedelta
from decimal import ROUND_DOWN, Decimal

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

from core import bonus_services, game_logging
from core.game_schemas import (
    LOST,
    VOID,
    CallbackPayload,
    LaunchRequest,
    SportsSelection,
    SportsSettlement,
    provider_references,
)
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
CENT = Decimal('0.01')


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
        # Bonus credit is stakeable, so it counts toward the launch minimum
        # and is part of the credit the provider is handed.
        available = WalletRepository.playable(wallet)
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
    # Bet-slip settlements only: what happened to each stake, for the log.
    bets: tuple = ()


def process_callback(envelope: dict, raw_body: str | None = None) -> dict:
    """Decrypt, validate, and settle an aggregator bet/win callback.

    Returns the aggregator-shaped encrypted ack dict. Designed so that:

    - **Idempotent**: a repeated ``serial_number`` is detected (unique DB index
      + pre-check) and re-acks without double-settling the wallet.
    - **Transaction-safe**: the wallet is row-locked and all writes (round,
      wallet, session, ledger transaction) commit atomically or not at all.
    - **Heartbeat-aware**: a zero bet+win callback just returns the balance —
      unless it carries a sportsbook's final bet-slip result, which settles the
      stakes it names (see :func:`_settle_sports_slip`).

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

    # 3. A sportsbook's final result for a bet slip. It is recognised from
    #    what the provider says (exchange_payout, bet_slip_settle, final
    #    selection statuses) and never from the amounts: a losing slip settles
    #    with bet 0 / win 0 because its stakes were taken at placement, so it
    #    looks exactly like the balance-sync ping below.
    slip = _sports_settlement(cb, plain)
    if slip is not None:
        game_logging.sports_settlement_received(
            user_id, cb.member_account, cb.game_uid, cb.serial_number,
            slip.bet_slip_id, slip.operation, len(slip.selections),
            slip.trade_profit, cb.win_amount,
        )

    # 4. Zero-value callback that is not a result: a balance-sync ping, no
    #    settlement. A delayed-settlement provider's keep-alive ping can
    #    legitimately echo the game_round of a stake that is still open (e.g.
    #    a sportsbook match still running) — that is not the provider
    #    reporting a loss, so a same-round ping must never force-settle it.
    #    Genuine results arrive as a real win/loss callback (handled below in
    #    _settle, which also resolves any sibling stake on the same round) or
    #    as a bet-slip result (step 3); a stake the provider never reports on
    #    is eventually force-settled by settle_stale_pending_rounds() instead.
    if cb.is_heartbeat and slip is None:
        wallet = WalletRepository.get(user_id)
        balance = WalletRepository.playable(wallet)
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='heartbeat', message='Balance sync',
        )
        game_logging.heartbeat(user_id, cb.game_uid, cb.serial_number, balance)
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)

    # 5. Fast idempotency pre-check (avoids opening a txn for known duplicates).
    if GameRoundRepository.exists(cb.serial_number):
        wallet = WalletRepository.get(user_id)
        balance = WalletRepository.playable(wallet)
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='duplicate', message='Duplicate serial_number (pre-check)',
        )
        game_logging.duplicate(user_id, cb.game_uid, cb.serial_number, 'pre-check')
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)

    # 6. Settle atomically under a wallet row lock.
    try:
        if slip is not None:
            settlement = _settle_sports_slip(user_id, cb, slip)
        else:
            settlement = _settle(user_id, cb)
    except _DuplicateRound:
        # Lost a race on the unique serial_number — treat as idempotent success.
        wallet = WalletRepository.get(user_id)
        balance = WalletRepository.playable(wallet)
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
    except _UnresolvedSlip as exc:
        # Nothing was written. Failing the callback makes the provider retry
        # it — the missing stake may simply not have landed yet — instead of
        # acking a settlement that did not happen.
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message=str(exc),
        )
        game_logging.sports_settlement_rejected(
            user_id, cb.member_account, cb.game_uid, cb.serial_number,
            slip.bet_slip_id, cb.game_round, slip.bet_ids, str(exc),
        )
        raise GameError('settlement_error', str(exc)) from exc

    if slip is not None:
        return _ack_sports_settlement(user_id, cb, slip, settlement, plain, raw_body, secret)

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


def replay_sports_settlements(since=None, dry_run: bool = False) -> dict:
    """Settle sportsbook bet-slip results that were acked as heartbeats.

    Until settlement read a sportsbook's own result, a losing slip — bet 0 /
    win 0, its stakes taken at placement — was logged as a balance-sync ping
    and its stakes left Pending, and the provider never resends a callback it
    was acked for. Each such stored callback is replayed through
    :func:`process_callback` exactly as a redelivery would be: the stakes it
    names are settled and it is logged again with its real outcome. A
    heartbeat carries no money, so neither can its replay; a slip already
    settled (by a later callback or the stale sweep) reads as a duplicate.
    """
    found: list[dict] = []
    outcomes = {'settled': 0, 'duplicate': 0, 'rejected': 0}
    for log in CallbackLogRepository.heartbeats(since):
        payload = log.decrypted_payload
        if not isinstance(payload, dict):
            continue
        try:
            cb = CallbackPayload.parse(payload)
        except ValueError:
            continue
        slip = _sports_settlement(cb, payload) if cb.is_heartbeat else None
        if slip is None:
            continue
        found.append({
            'serial_number': cb.serial_number,
            'member_account': cb.member_account,
            'bet_slip_id': slip.bet_slip_id,
            'selections': len(slip.selections),
            'received_at': log.created_at.isoformat(),
        })
        if dry_run:
            continue
        try:
            process_callback(payload, raw_body=log.raw_payload)
        except GameError:
            outcomes['rejected'] += 1
            continue
        result = CallbackLogRepository.latest_result(cb.serial_number)
        outcomes[result] = outcomes.get(result, 0) + 1
    return {'found': found, **({} if dry_run else outcomes)}


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
        main_before = wallet.main_balance
        # Round history reports the balance the player actually plays against,
        # which includes bonus credit — not just the withdrawable part.
        balance_before = main_before + wallet.bonus_balance

        # A payout-only callback is the *result* of a stake already recorded as
        # PENDING, not a new bet. Fold the payout into that stake row so one
        # wager stays one round; recording it separately leaves a phantom
        # "bet 0 / win N" round and books the gross payout as profit instead of
        # the real net (262 paid on a 300 stake is a 38 loss, not a 262 win).
        merged_round = None
        if cb.bet_amount == ZERO and cb.win_amount > ZERO:
            # Any provider may report a stake and its result as two callbacks,
            # not just the ones flagged delayed-settlement, so match the stake
            # whatever its settle_status. Without this a slots/live-casino
            # payout cannot find its (already SETTLED) stake and is written as a
            # separate row, which is what made one bet show twice in history.
            open_stakes = GameRoundRepository.lock_unpaid_stakes(
                user_id, cb.game_round,
                provider_id=game.provider_id if game else None,
                game_uid=cb.game_uid,
            )
            if open_stakes:
                # Pay onto the oldest open stake on this round; splitting a
                # single payout across several would need a per-stake breakdown
                # the provider does not send.
                merged_round = min(open_stakes, key=lambda r: r.id)

        # Whether the stake being merged was still counted as pending on its
        # session: only then does folding the payout in resolve a pending round.
        merged_was_pending = (
            merged_round is not None
            and merged_round.settle_status == GameRound.SettleStatus.PENDING
        )

        if merged_round is not None:
            # The row keeps the balance_before it recorded at bet time, so its
            # balance_after must be the end state of the whole wager — the
            # balance now that the payout has landed, not `balance_before + net`
            # (that `balance_before` is the post-stake balance, a different
            # anchor, and would double-count the stake).
            round_row = GameRoundRepository.settle_with_payout(
                merged_round,
                win_amount=cb.win_amount,
                serial_number=cb.serial_number,
                balance_after=balance_before + net,
                provider_timestamp=cb.timestamp,
            )
        else:
            # Create the round first so the unique serial_number guards the
            # wallet write — if this row already exists we abort before moving
            # money.
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

        # Wallet: take the stake from bonus credit first, then real money, and
        # pay every win into the real balance. Spending bonus money down before
        # cash is what makes the credit playable without ever making it
        # withdrawable — a win on a bonus stake lands as real, wagering-tracked
        # money, not as more bonus. Decrement the legacy wagering requirement by
        # the amount wagered (tbl_requiredplay_balance semantics).
        from_bonus = min(cb.bet_amount, max(wallet.bonus_balance, ZERO))
        wallet.bonus_balance -= from_bonus
        wallet.main_balance = main_before - (cb.bet_amount - from_bonus) + cb.win_amount
        new_wagering = wallet.wagering_balance - cb.bet_amount
        wallet.wagering_balance = new_wagering if new_wagering > ZERO else ZERO
        wallet.save(update_fields=[
            'main_balance', 'bonus_balance', 'wagering_balance', 'updated_at',
        ])

        # This callback carrying a win is also the result for any stake still
        # open on the same round — clear those first so the session is re-read
        # below with its pending counter already decremented. The row merged
        # above is already SETTLED and so is no longer matched here; any *other*
        # stake still open on this round lost and is resolved now.
        if not pending:
            _resolve_open_stakes(
                user_id, cb.game_round,
                provider_id=game.provider_id if game else None,
                game_uid=cb.game_uid,
            )

        # Attribute to the latest session for this user+game (creating none here;
        # a callback without a prior launch is still settled and logged).
        # A merged payout belongs to the session its stake was booked on, not
        # whichever session happens to be newest now.
        session = (
            GameSession.objects.filter(id=merged_round.session_id).first()
            if merged_round is not None and merged_round.session_id
            else GameSessionRepository.latest_for_settlement(
                user_id, cb.game_uid,
                provider_id=game.provider_id if game else None,
            )
        )
        if session:
            session.total_bet += cb.bet_amount
            session.total_win += cb.win_amount
            session.profit_loss = session.total_win - session.total_bet
            # A merged payout resolves a round already counted at stake time —
            # counting it again would report two rounds for one bet.
            if merged_round is None:
                session.rounds_count += 1
            elif merged_was_pending:
                # Only a stake still counted pending clears a pending slot; one
                # already SETTLED (an ordinary slots stake whose payout arrived
                # separately) was never counted there.
                session.pending_rounds = max(0, session.pending_rounds - 1)
            if pending:
                session.pending_rounds += 1
            session.last_balance = WalletRepository.playable(wallet)
            session.last_played_at = timezone.now()
            session.status = _session_status(session)
            session.save(update_fields=[
                'total_bet', 'total_win', 'profit_loss', 'rounds_count',
                'pending_rounds', 'last_balance', 'last_played_at', 'status',
                'updated_at',
            ])
            # A live-table callback often names a table UID that is not in the
            # catalog, so the round was stored with no game. The launch session
            # already knows the table the player opened — copy that identity
            # across so history can name the game and its provider.
            identity = {}
            if round_row.session_id is None:
                identity['session_id'] = session.id
            if round_row.game_id is None and session.game_id:
                identity['game_id'] = session.game_id
            if not (round_row.game_name or '').strip() and session.game_name:
                identity['game_name'] = session.game_name
            if identity:
                GameRound.objects.filter(id=round_row.id).update(**identity)

        # Ledger: record the net wallet movement as a bet_settlement transaction.
        if net != ZERO:
            Transaction.objects.create(
                user_id=user_id,
                type=Transaction.TxType.BET_SETTLEMENT,
                amount=abs(net),
                currency=cb.currency_code or wallet.currency,
                status=Transaction.Status.COMPLETED,
                reference_number=cb.serial_number,
                notes='Win' if net > 0 else 'Loss',
            )

        # Wagering: every rupee staked counts toward any pending bonus target,
        # win or lose. Weighted by the provider the bet was placed on. A bonus
        # that clears here is credited to the withdrawable balance immediately.
        # Guarded because a fault in the bonus engine must never roll back a
        # settlement the provider has already applied on their side.
        if cb.bet_amount > ZERO:
            try:
                bonus_services.record_wagering(
                    user_id,
                    cb.bet_amount,
                    provider_id=game.provider_id if game else None,
                )
            except Exception as exc:
                game_logging.wagering_failed(user_id, cb.serial_number, str(exc))

        return SettlementResult(result='settled', credit_amount=WalletRepository.playable(wallet))


# --------------------------------------------------------------------------- #
# Sportsbook bet-slip settlement
# --------------------------------------------------------------------------- #

class _UnresolvedSlip(Exception):
    """A bet-slip result that cannot be applied to its stakes as a whole."""


@dataclass(frozen=True)
class _SlipBet:
    """What one bet-slip settlement did to one stake, for the log."""

    round_id: int
    bet_id: str | None
    status: str | None
    profit: Decimal | None
    stake: Decimal
    win: Decimal
    state: str  # 'settled' | 'awaiting_payout' | 'unchanged'
    issue: str | None = None


def _sports_settlement(cb: CallbackPayload, payload: dict) -> SportsSettlement | None:
    """The bet-slip result this callback reports, if it reports one."""
    slip = SportsSettlement.parse(payload)
    if slip is None or cb.bet_amount > ZERO:
        # A callback that takes a stake is a bet placement, whatever else it
        # carries; the ordinary stake path records it.
        return None
    if not slip.explicit and not GameRepository.settles_late(
        GameRepository.get_by_uid(cb.game_uid)
    ):
        # Selection statuses alone are only read as a result from a game whose
        # bets wait for one, never from a casino round's detail.
        return None
    return slip


def _natural_key(text: str | None) -> list:
    return [(0, int(p)) if p.isdigit() else (1, p) for p in re.split(r'(\d+)', text or '')]


def _pair_selections(
    slip: SportsSettlement,
    rows: list[GameRound],
    refs: dict[int, set],
    slip_keys: set,
) -> list[tuple[GameRound, SportsSelection]]:
    """Tie every selection of the slip to the recorded stake it settles.

    Evidence, strongest first:

    1. The provider's bet id, named by the stake's round id or by its own
       stake callback. A callback that re-listed the slip's earlier bets names
       several; pairing the unambiguous ones first narrows the rest down.
    2. Among the slip's stakes (same bet slip / provider round): a losing
       bet's loss is exactly its stake.
    3. Whatever is left pairs one-to-one within the slip in placement order.
       Only reachable for several unidentified winning/void bets, where the
       wallet is credited the same total either way.

    A selection left over — its stake never recorded, or more candidate stakes
    than can be told apart — raises :class:`_UnresolvedSlip` for the whole
    slip, so it is retried complete rather than half-settled.
    """
    selections = slip.selections
    by_id = {r.id: r for r in rows}
    pairs: dict[int, SportsSelection] = {}
    unpaired = list(range(len(selections)))

    options = [
        [r.id for r in rows if sel.bet_id and sel.bet_id in refs[r.id]]
        for sel in selections
    ]
    progress = True
    while progress:
        progress = False
        for i in list(unpaired):
            free = [rid for rid in options[i] if rid not in pairs]
            if len(free) == 1:
                pairs[free[0]] = selections[i]
                unpaired.remove(i)
                progress = True

    if unpaired:
        keys = {k for k in slip_keys if k}
        pool = [
            r for r in rows
            if r.id not in pairs
            and (refs[r.id] & keys or any(r.id in options[i] for i in unpaired))
        ]
        for i in list(unpaired):
            sel = selections[i]
            if sel.outcome != LOST or sel.profit is None:
                continue
            preferred = [r for r in pool if r.id in options[i]] or pool
            match = next((r for r in preferred if r.bet_amount == -sel.profit), None)
            if match is not None:
                pairs[match.id] = sel
                pool.remove(match)
                unpaired.remove(i)
        if unpaired and len(unpaired) == len(pool):
            ordered = sorted(unpaired, key=lambda i: _natural_key(selections[i].bet_id))
            for i, r in zip(ordered, sorted(pool, key=lambda r: r.id)):
                pairs[r.id] = selections[i]
            unpaired = []
        if unpaired:
            bets = ', '.join(selections[i].bet_id or '?' for i in unpaired)
            raise _UnresolvedSlip(
                f'No recorded stake for bet(s) {bets}'
                if len(pool) < len(unpaired)
                else f'Cannot tell which stake settles bet(s) {bets}'
            )

    return [(by_id[rid], sel) for rid, sel in sorted(pairs.items())]


def _expected_return(stake: Decimal, sel: SportsSelection) -> Decimal | None:
    """What the provider's result says this stake pays back, when it says."""
    if sel.outcome == LOST:
        return ZERO
    if sel.profit is not None:
        return max(stake + sel.profit, ZERO)
    return stake if sel.outcome == VOID else None


def _split_payout(payout: Decimal, weights: dict[int, Decimal]) -> dict[int, Decimal]:
    """Divide ``payout`` across stakes in proportion to ``weights``.

    Rounded down to the paisa with the remainder on the largest share, so the
    per-bet amounts always add up to exactly what the wallet was credited.
    """
    total = sum(weights.values())
    shares = {
        rid: (payout * weight / total).quantize(CENT, rounding=ROUND_DOWN)
        for rid, weight in weights.items()
    }
    largest = max(weights, key=lambda rid: (weights[rid], -rid))
    shares[largest] += payout - sum(shares.values())
    return shares


def _settle_sports_slip(
    user_id: int, cb: CallbackPayload, slip: SportsSettlement
) -> SettlementResult:
    """Apply a sportsbook's final bet-slip result to the stakes it names.

    The stakes were debited when the bets were placed, so settling moves no
    money except the payout the aggregator sends with the result
    (``win_amount``), credited to the real balance exactly as :func:`_settle`
    pays a win. A lost bet is only marked settled — never debited again.
    The payout is spread over the slip's won/voided stakes in proportion to
    what the provider says each returns, so every bet reads its own result
    (a void returns its stake: net 0, the way a refund already reads).

    All or nothing: a selection that cannot be tied to a recorded stake fails
    the whole slip with :class:`_UnresolvedSlip` before anything is written.
    Idempotent: the callback's serial is folded onto one stake it settles
    (unique index), and a slip whose stakes are already settled and paid is
    reported as a duplicate — even redelivered under a new serial, it never
    pays twice.
    """
    unfinished = [s.bet_id or '?' for s in slip.selections if not s.final]
    if not slip.selections or unfinished:
        raise _UnresolvedSlip(
            f'No final result for bet(s) {", ".join(unfinished)}'
            if unfinished else 'Settlement lists no selections'
        )

    game = GameRepository.get_by_uid(cb.game_uid)
    payout = cb.win_amount

    with tenant_atomic():
        # The wallet lock serializes every callback for this player, so the
        # stakes cannot be re-settled under us by another callback.
        wallet = WalletRepository.lock(user_id)  # SELECT ... FOR UPDATE
        rows = GameRoundRepository.slip_stake_candidates(
            user_id,
            {cb.game_round, slip.bet_slip_id, *slip.bet_ids},
            provider_id=game.provider_id if game else None,
            game_uid=cb.game_uid,
        )
        payloads = CallbackLogRepository.first_payloads(
            [r.stake_serial or r.serial_number for r in rows]
        )
        refs = {
            r.id: provider_references(payloads.get(r.stake_serial or r.serial_number))
            | ({r.game_round} if r.game_round else set())
            for r in rows
        }
        pairs = _pair_selections(slip, rows, refs, {slip.bet_slip_id, cb.game_round})

        # Lock just the stakes being settled and decide on their current state
        # (the stale sweep does not take the wallet lock).
        locked = GameRoundRepository.lock_by_ids(r.id for r, _ in pairs)
        if len(locked) != len(pairs):
            raise _UnresolvedSlip('A stake of the slip changed during settlement')
        pairs = [(locked[r.id], sel) for r, sel in pairs]

        expected = {r.id: _expected_return(r.bet_amount, sel) for r, sel in pairs}
        # Stakes this result pays something back on that have not been paid.
        owed = [
            r for r, _ in pairs
            if (expected[r.id] is None or expected[r.id] > ZERO) and r.win_amount <= ZERO
        ]
        shares: dict[int, Decimal] = {}
        mismatch_row = None
        if payout > ZERO:
            if owed:
                shares = _split_payout(payout, {
                    r.id: expected[r.id] if expected[r.id] is not None else r.bet_amount
                    for r in owed
                })
            elif any(r.win_amount > ZERO for r, _ in pairs):
                # Everything this result pays was paid by an earlier callback:
                # the same result again under a new serial. Pay nothing.
                return SettlementResult(
                    result='duplicate', credit_amount=WalletRepository.playable(wallet),
                )
            else:
                # Paid although the provider reports every bet lost. Moving
                # money is the aggregator's call, so it lands on the slip's
                # first stake and the disagreement is logged loudly.
                mismatch_row = pairs[0][0]
                shares = {mismatch_row.id: payout}

        if payout > ZERO:
            # Nothing is staked here, so bonus money and the wagering
            # requirement are untouched; winnings go to the real balance.
            wallet.main_balance += payout
            wallet.save(update_fields=['main_balance', 'updated_at'])
        balance = WalletRepository.playable(wallet)

        # A pending stake settles when its result needs no money (lost) or
        # its money is here; one owed money that did not come stays pending.
        writes = [
            (r, shares.get(r.id, ZERO))
            for r, _ in pairs
            if r.id in shares
            or (r.settle_status == GameRound.SettleStatus.PENDING and expected[r.id] == ZERO)
        ]
        if not writes and not owed:
            # Every stake is already settled and nothing was paid: a redelivery.
            return SettlementResult(result='duplicate', credit_amount=balance)

        # The callback's serial goes on a paid stake when there is one (the
        # ledger row references it), else on one settled now.
        anchor = next(
            (r for r, share in writes if share > ZERO and not r.stake_serial), None
        ) or next((r for r, _ in writes if not r.stake_serial), None)

        per_session: dict[int, list] = {}
        for r, share in writes:
            was_pending = r.settle_status == GameRound.SettleStatus.PENDING
            try:
                GameRoundRepository.settle_slip_stake(
                    r,
                    win_amount=r.win_amount + share,
                    # Paid stakes end where the payout left the wallet; a lost
                    # one keeps the balance recorded when it was staked.
                    balance_after=balance if share > ZERO else r.balance_after,
                    serial_number=cb.serial_number if r is anchor else None,
                    provider_timestamp=cb.timestamp if r is anchor else None,
                )
            except IntegrityError as exc:
                raise _DuplicateRound() from exc
            if r.session_id:
                entry = per_session.setdefault(r.session_id, [0, ZERO])
                entry[0] += 1 if was_pending else 0
                entry[1] += share

        for session_id, (resolved, won) in per_session.items():
            session = GameSession.objects.filter(id=session_id).first()
            if not session:
                continue
            session.pending_rounds = max(0, session.pending_rounds - resolved)
            if won > ZERO:
                session.total_win += won
                session.profit_loss = session.total_win - session.total_bet
                session.last_balance = balance
                session.last_played_at = timezone.now()
            session.status = _session_status(session)
            session.save(update_fields=[
                'total_win', 'profit_loss', 'pending_rounds', 'last_balance',
                'last_played_at', 'status', 'updated_at',
            ])

        # Ledger: the payout is this callback's net wallet movement, recorded
        # in the same shape _settle records a win.
        if payout > ZERO:
            Transaction.objects.create(
                user_id=user_id,
                type=Transaction.TxType.BET_SETTLEMENT,
                amount=payout,
                currency=cb.currency_code or wallet.currency,
                status=Transaction.Status.COMPLETED,
                reference_number=cb.serial_number,
                notes='Win',
            )

        written = {r.id for r, _ in writes}
        bets = tuple(
            _SlipBet(
                round_id=r.id,
                bet_id=sel.bet_id,
                status=sel.status,
                profit=sel.profit,
                stake=r.bet_amount,
                win=r.win_amount,
                state=(
                    'settled' if r.id in written
                    else 'awaiting_payout' if r in owed
                    else 'unchanged'
                ),
                issue='paid although reported lost' if r is mismatch_row else None,
            )
            for r, sel in pairs
        )
        return SettlementResult(result='settled', credit_amount=balance, bets=bets)


def _ack_sports_settlement(
    user_id: int,
    cb: CallbackPayload,
    slip: SportsSettlement,
    settlement: SettlementResult,
    plain: dict,
    raw_body: str | None,
    secret: str | None,
) -> dict:
    """Audit and log a processed bet-slip result, then build the ack."""
    balance = settlement.credit_amount
    if settlement.result == 'duplicate':
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='duplicate', message='Bet slip already settled',
        )
        game_logging.duplicate(
            user_id, cb.game_uid, cb.serial_number, 'bet slip already settled',
        )
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)

    settled = awaiting = 0
    for bet in settlement.bets:
        if bet.state == 'settled':
            settled += 1
            game_logging.sports_bet_settled(
                user_id, cb.serial_number, bet.bet_id, bet.round_id, bet.status,
                bet.profit, bet.stake, bet.win, bet.issue,
            )
        elif bet.state == 'awaiting_payout':
            awaiting += 1
            game_logging.sports_bet_unpaid(
                user_id, cb.serial_number, bet.bet_id, bet.round_id, bet.status,
                bet.profit, bet.stake,
            )
    CallbackLogRepository.record(
        serial_number=cb.serial_number, member_account=cb.member_account,
        game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
        result='settled',
        message=(
            f'slip={slip.bet_slip_id} settled={settled} awaiting={awaiting} '
            f'win={cb.win_amount} bal={balance}'
        ),
    )
    game_logging.sports_slip_settled(
        user_id, cb.serial_number, slip.bet_slip_id, settled, awaiting,
        cb.win_amount, balance,
    )
    return game_provider.build_ack(f'{balance:.2f}', cb.timestamp, secret)


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #

def serialize_session(s: GameSession, first_balance=None) -> dict:
    """One bet-history row. ``result`` is the player-facing label; a session
    still waiting on the provider reads Pending rather than a premature loss.

    ``first_balance`` is the wallet balance the session opened on. It lives on
    the session's earliest round rather than the session row, so callers that
    show it pass it in (batched for a whole page) instead of paying a query per
    row here.
    """
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
        'first_balance': float(first_balance) if first_balance is not None else None,
        'last_balance': float(s.last_balance) if s.last_balance is not None else None,
        'last_played_at': s.last_played_at.isoformat() if s.last_played_at else None,
        'created_at': s.created_at.isoformat(),
    }


def displayed_game(r: GameRound) -> tuple[str | None, str | None, str | None]:
    """Game name, category and provider for a stored round.

    Prefer the name recorded on the round (the specific table, when the
    callback's UID is in the catalog). When the callback used a table UID that
    is not in the catalog, the round was filed on the launch session with a
    blank name — use that session's game so history still names what was played.
    """
    game = r.game
    name = (r.game_name or '').strip() or (game.name if game else '')
    if game is None or not name:
        session = r.session if r.session_id else None
        if session is not None:
            if game is None:
                game = session.game
            if not name:
                name = (session.game_name or '').strip() or (game.name if game else '')
    provider = game.provider if game is not None else None
    return (
        name or None,
        game.category if game is not None else None,
        provider.name if provider is not None else None,
    )


def serialize_round(r: GameRound) -> dict:
    """One round inside a session — the drill-down detail behind a history row."""
    net = r.win_amount - r.bet_amount
    is_pending = r.settle_status == GameRound.SettleStatus.PENDING
    game_name, category, provider = displayed_game(r)
    return {
        'id': r.id,
        'serial_number': r.serial_number,
        'game_round': r.game_round,
        'game_name': game_name,
        'game_uid': r.game_uid,
        # Bet history has to name the category a wager was placed in, not just
        # the game, so a row reads "Aviator (crash)" rather than a bare title.
        'category': category,
        'provider': provider,
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
        _big_win_row(r)
        for r in GameRoundRepository.recent_big_wins(limit, threshold)
    ]


def _big_win_row(r: GameRound) -> dict:
    name, category, _provider = displayed_game(r)
    game = r.game or (r.session.game if r.session_id else None)
    return {
        'id': r.id,
        # Prefer the display name: account usernames are sequential codes
        # (usr00002), which mask down to an identical "u***2" for everyone.
        'username': _mask_username(r.user.full_name or r.user.username),
        'game_name': name or 'Casino',
        'game_uid': r.game_uid,
        'category': category,
        'thumbnail_url': game.thumbnail_url if game is not None else None,
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
