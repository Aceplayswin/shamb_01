"""Validation/parsing schemas for gaming-module request bodies.

Lightweight, dependency-free validators (no DRF serializers needed for these
simple shapes) that normalize and validate input before it reaches the service
layer. Each raises ``ValueError`` with a clear message on bad input, which the
views translate into 400 responses.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

_GAME_UID_RE = re.compile(r'^[a-fA-F0-9]{16,64}$')


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
        # Balance-sync ping: no money moves, just return current balance.
        return self.bet_amount == 0 and self.win_amount == 0
