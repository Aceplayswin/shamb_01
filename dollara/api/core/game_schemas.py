"""Validation/parsing schemas for gaming-module request bodies.

Lightweight, dependency-free validators (no DRF serializers needed for these
simple shapes) that normalize and validate input before it reaches the service
layer. Each raises ``ValueError`` with a clear message on bad input, which the
views translate into 400 responses.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

# The main aggregator's uids are long hex strings, but a separately-integrated
# vendor (the lottery provider) identifies its games by short numeric ids. The
# old pattern only allowed 16-64 hex characters, so every launch of one of those
# games was rejected before it reached the service layer and surfaced to the
# player as an internal server error. Accept any short, safe identifier token
# instead — the game still has to exist in our catalog to launch, which is the
# real authorization check.
_GAME_UID_RE = re.compile(r'^[A-Za-z0-9_-]{1,64}$')


def _require(body: dict, key: str):
    if key not in body or body[key] in (None, ''):
        raise ValueError(f'{key} is required')
    return body[key]


@dataclass(frozen=True)
class LaunchRequest:
    game_uid: str
    game_name: str | None
    platform: str
    language: str | None

    @classmethod
    def parse(cls, body: dict) -> 'LaunchRequest':
        # Accept both new (gameUid/gameName) and legacy (GAME_UID/GAME_NAME) keys
        # so the existing frontend game flow keeps working unchanged.
        game_uid = body.get('gameUid') or body.get('GAME_UID') or body.get('game_uid')
        if not game_uid:
            raise ValueError('gameUid is required')
        game_uid = str(game_uid).strip()
        if not _GAME_UID_RE.match(game_uid):
            raise ValueError('gameUid is not a valid game identifier')
        game_name = body.get('gameName') or body.get('GAME_NAME') or body.get('game_name')
        platform = str(body.get('platform', 'web')).strip() or 'web'
        if platform not in ('web', 'mobile', 'h5'):
            platform = 'web'
        language = body.get('language')
        return cls(
            game_uid=game_uid,
            game_name=str(game_name).strip() if game_name else None,
            platform=platform,
            language=str(language).strip() if language else None,
        )


@dataclass(frozen=True)
class CallbackPayload:
    member_account: str
    game_uid: str
    serial_number: str
    bet_amount: Decimal
    win_amount: Decimal
    game_round: str | None
    currency_code: str | None
    timestamp: str | None

    @classmethod
    def parse(cls, payload: dict) -> 'CallbackPayload':
        member_account = _require(payload, 'member_account')
        game_uid = _require(payload, 'game_uid')
        serial_number = _require(payload, 'serial_number')
        try:
            bet_amount = Decimal(str(payload.get('bet_amount', '0') or '0'))
            win_amount = Decimal(str(payload.get('win_amount', '0') or '0'))
        except (InvalidOperation, TypeError) as exc:
            raise ValueError('bet_amount/win_amount must be numeric') from exc
        if bet_amount < 0 or win_amount < 0:
            raise ValueError('bet_amount/win_amount must be non-negative')
        return cls(
            member_account=str(member_account),
            game_uid=str(game_uid),
            serial_number=str(serial_number),
            bet_amount=bet_amount,
            win_amount=win_amount,
            game_round=str(payload['game_round']) if payload.get('game_round') else None,
            currency_code=payload.get('currency_code'),
            timestamp=payload.get('timestamp'),
        )

    @property
    def is_heartbeat(self) -> bool:
        # Balance-sync ping: no money moves, just return current balance. A
        # sportsbook result can also move no money (a losing slip) — that one is
        # recognised from its payload by SportsSettlement, not from the amounts.
        return self.bet_amount == 0 and self.win_amount == 0


# --------------------------------------------------------------------------- #
# Sportsbook bet-slip settlement (exchange products behind the aggregator)
# --------------------------------------------------------------------------- #

# Provider operation carrying the final result of an exchange bet slip.
SETTLEMENT_OPERATIONS = frozenset({'exchange_payout'})

WON, LOST, VOID = 'won', 'lost', 'void'

# Final selection statuses, mapped onto the results bet history already shows.
_SELECTION_OUTCOMES = {
    'win': WON, 'won': WON,
    'lost': LOST, 'lose': LOST, 'loss': LOST,
    'void': VOID, 'voided': VOID, 'refund': VOID, 'refunded': VOID,
    'cancelled': VOID, 'canceled': VOID,
}

_SETTLEMENT_KEYS = ('transaction', 'selections', 'bet_slip_settle')
_ID_KEY_RE = re.compile(r'(?:^|_)id$')
_CAMEL_RE = re.compile(r'(?<=[a-z0-9])([A-Z])')


def _decimal_or_none(value) -> Decimal | None:
    if value is None or value == '' or isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return number if number.is_finite() else None


def _json_object(value) -> dict | None:
    """A dict, or the dict inside a JSON-encoded string (the ``data`` key)."""
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value.lstrip().startswith('{'):
        try:
            parsed = json.loads(value)
        except ValueError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _text(value) -> str | None:
    text = str(value).strip() if value is not None else ''
    return text or None


def provider_references(payload: dict | None) -> set[str]:
    """Every identifier a callback's payload names — bet ids, bet-slip ids, …

    Sportsbooks behind the aggregator embed their own record as a JSON string
    in ``data``; it is what names the provider's bet, which the aggregator's
    ``game_round`` may not. Only values under id-like keys (``bet_id``,
    ``betslipId``, ``id``) are collected, so amounts and statuses never
    masquerade as identifiers.
    """
    refs: set[str] = set()

    def walk(node, key: str | None = None) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, str(k))
        elif isinstance(node, list):
            for item in node:
                walk(item, key)
        elif (
            key is not None
            and isinstance(node, (str, int))
            and not isinstance(node, bool)
            and _ID_KEY_RE.search(_CAMEL_RE.sub(r'_\1', key).lower())
        ):
            text = _text(node)
            if text:
                refs.add(text)

    walk(payload)
    if isinstance(payload, dict):
        walk(_json_object(payload.get('data')))
    return refs


@dataclass(frozen=True)
class SportsSelection:
    bet_id: str | None
    status: str | None          # the provider's own word, lower-cased
    outcome: str | None         # WON / LOST / VOID; None when not a known status
    profit: Decimal | None      # provider's net result for the bet (+win / -loss)
    final: bool                 # whether this selection is resolved


@dataclass(frozen=True)
class SportsSettlement:
    """A sportsbook's final result for one bet slip, as the provider reports it.

    Recognised from what the provider says — an ``exchange_payout`` operation,
    a ``bet_slip_settle`` block, or selections in a final status — and never
    from the aggregator's bet/win amounts: a losing slip settles with both at
    0, because its stakes were taken when the bets were placed.
    """

    bet_slip_id: str | None
    operation: str | None
    trade_profit: Decimal | None
    # The provider explicitly declared the slip settled (operation or
    # bet_slip_settle), as opposed to it being inferred from selection statuses.
    explicit: bool
    selections: tuple[SportsSelection, ...]

    @property
    def bet_ids(self) -> tuple[str, ...]:
        return tuple(s.bet_id for s in self.selections if s.bet_id)

    @classmethod
    def parse(cls, payload: dict) -> 'SportsSettlement | None':
        """The settlement in an aggregator callback, or ``None`` if it has none."""
        detail = None
        # The provider record normally rides in `data`; accept it flattened
        # onto the top level too, rather than miss a settlement over layout.
        for candidate in (_json_object((payload or {}).get('data')), payload or {}):
            if candidate and any(key in candidate for key in _SETTLEMENT_KEYS):
                detail = candidate
                break
        if detail is None:
            return None

        txn = detail.get('transaction')
        txn = txn if isinstance(txn, dict) else {}
        slip_settle = detail.get('bet_slip_settle')
        slip_settle = slip_settle if isinstance(slip_settle, dict) else None
        raw_selections = detail.get('selections')
        raw_selections = raw_selections if isinstance(raw_selections, list) else []

        operation = (_text(txn.get('operation')) or '').lower() or None
        explicit = operation in SETTLEMENT_OPERATIONS or slip_settle is not None

        selections = []
        slip_ids = []
        for raw in raw_selections:
            if not isinstance(raw, dict):
                continue
            status = (_text(raw.get('status')) or '').lower() or None
            outcome = _SELECTION_OUTCOMES.get(status or '')
            profit = _decimal_or_none(raw.get('profit'))
            selections.append(SportsSelection(
                bet_id=_text(raw.get('bet_id')),
                status=status,
                outcome=outcome,
                profit=profit,
                # A status we have no mapping for (say "half_won") is still a
                # result when the provider has declared the slip settled and
                # given the bet's profit — that figure is the outcome.
                final=outcome is not None or (explicit and profit is not None),
            ))
            slip_ids.append(raw.get('betslip_id') or raw.get('bet_slip_id'))

        if not explicit:
            # Without the provider declaring the slip settled, only selections
            # in a final status are results; in-play updates (open/matched
            # bets) are not a settlement at all.
            selections = [s for s in selections if s.final]
            if not selections:
                return None

        bet_slip_id = next(
            (
                _text(v) for v in (
                    (slip_settle or {}).get('bet_slip_id'),
                    txn.get('betslip_id'),
                    txn.get('bet_slip_id'),
                    *slip_ids,
                )
                if _text(v)
            ),
            None,
        )
        return cls(
            bet_slip_id=bet_slip_id,
            operation=operation,
            trade_profit=_decimal_or_none((slip_settle or {}).get('trade_profit')),
            explicit=explicit,
            selections=tuple(selections),
        )
