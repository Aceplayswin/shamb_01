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
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

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

    try:
        launch_url = game_provider.request_launch_url(
            user_id=user_id,
            game_uid=req.game_uid,
            credit_amount=f'{available:.2f}',
            language=req.language,
            platform=req.platform,
        )
    except game_provider.ProviderConfigError as exc:
        raise GameError('server_error', str(exc)) from exc
    except game_provider.ProviderError as exc:
        raise GameError('server_error', str(exc)) from exc

    member_account = game_provider.build_member_account(user_id)
    game_name = req.game_name or game.name

    with tenant_atomic():
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
    # 1. Decrypt the envelope -> plain payload.
    try:
        plain = game_provider.parse_callback(envelope)
    except game_provider.ProviderError as exc:
        CallbackLogRepository.record(
            serial_number=None, member_account=None, game_uid=None,
            raw_payload=raw_body, decrypted_payload=None,
            result='error', message=str(exc),
        )
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
        raise GameError('invalid_params', str(exc)) from exc

    user_id_str = game_provider.strip_member_account(cb.member_account)
    try:
        user_id = int(user_id_str)
    except (TypeError, ValueError):
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message='Unresolvable member_account',
        )
        raise GameError('auth_error', 'Unknown member_account')

    # 3. Heartbeat / balance-sync: no settlement, just echo the balance.
    if cb.is_heartbeat:
        wallet = WalletRepository.get(user_id)
        balance = wallet.main_balance if wallet else ZERO
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='heartbeat', message='Balance sync',
        )
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp)

    # 4. Fast idempotency pre-check (avoids opening a txn for known duplicates).
    if GameRoundRepository.exists(cb.serial_number):
        wallet = WalletRepository.get(user_id)
        balance = wallet.main_balance if wallet else ZERO
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='duplicate', message='Duplicate serial_number (pre-check)',
        )
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp)

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
        return game_provider.build_ack(f'{balance:.2f}', cb.timestamp)
    except Wallet.DoesNotExist:
        CallbackLogRepository.record(
            serial_number=cb.serial_number, member_account=cb.member_account,
            game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
            result='rejected', message='Wallet not found',
        )
        raise GameError('auth_error', 'Wallet not found')

    CallbackLogRepository.record(
        serial_number=cb.serial_number, member_account=cb.member_account,
        game_uid=cb.game_uid, raw_payload=raw_body, decrypted_payload=plain,
        result='settled',
        message=f'bet={cb.bet_amount} win={cb.win_amount} bal={settlement.credit_amount}',
    )
    return game_provider.build_ack(f'{settlement.credit_amount:.2f}', cb.timestamp)


class _DuplicateRound(Exception):
    pass


def _settle(user_id: int, cb: CallbackPayload) -> SettlementResult:
    """Apply one bet/win event to wallet + session + ledger atomically."""
    net = cb.win_amount - cb.bet_amount  # +win, -loss
    game = GameRepository.get_by_uid(cb.game_uid)

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
                serial_number=cb.serial_number,
                game_round=cb.game_round,
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

        # Attribute to the latest session for this user+game (creating none here;
        # a callback without a prior launch is still settled and logged).
        session = GameSessionRepository.latest_for_settlement(user_id, cb.game_uid)
        if session:
            session.total_bet += cb.bet_amount
            session.total_win += cb.win_amount
            session.profit_loss = session.total_win - session.total_bet
            session.rounds_count += 1
            session.last_balance = wallet.main_balance
            session.last_played_at = timezone.now()
            session.status = (
                GameSession.Status.PROFIT
                if session.profit_loss >= ZERO
                else GameSession.Status.LOSS
            )
            session.save(update_fields=[
                'total_bet', 'total_win', 'profit_loss', 'rounds_count',
                'last_balance', 'last_played_at', 'status', 'updated_at',
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

def get_play_history(user_id: int, limit: int = 40, offset: int = 0) -> dict:
    """Paginated session history for a user (My Games / play records)."""
    sessions = GameSessionRepository.list_for_user(user_id, limit, offset)
    total = GameSessionRepository.count_for_user(user_id)
    records = [
        {
            'session_uid': s.session_uid,
            'game_name': s.game_name,
            'game_uid': s.game_uid,
            'category': s.game.category if s.game else None,
            'total_bet': float(s.total_bet),
            'total_win': float(s.total_win),
            'profit_loss': float(s.profit_loss),
            'rounds': s.rounds_count,
            'status': s.status,
            'last_balance': float(s.last_balance) if s.last_balance is not None else None,
            'last_played_at': s.last_played_at.isoformat() if s.last_played_at else None,
            'created_at': s.created_at.isoformat(),
        }
        for s in sessions
    ]
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


def get_user_pnl(user_id: int) -> dict:
    """Aggregate betting profit/loss for a user."""
    pnl = GameRoundRepository.user_pnl(user_id)
    return {
        'total_bet': float(pnl['total_bet']),
        'total_win': float(pnl['total_win']),
        'profit_loss': float(pnl['profit_loss']),
        'rounds': pnl['rounds'],
    }
