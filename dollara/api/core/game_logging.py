"""Structured, file-based logging for the game-play lifecycle.

Every meaningful event in a play — the launch attempt, the launch result (or the
exact reason it failed/was interrupted), and each aggregator callback with its
bet / win / loss / net and resulting balance — is written to ``logs/games.log``.
Anything that went wrong (launch failures, decrypt errors, rejected or
unsettleable callbacks, unexpected errors) is *additionally* written to
``logs/games_error.log`` so the failures are easy to find and diagnose.

This complements the database ``CallbackLog`` audit trail with a plain-text,
greppable record on disk that survives independently of the tenant DB. The
handlers/rotation are configured by ``LOGGING`` in ``config/settings.py``.

Lines are emitted as ``event tenant=… key=value …`` so they can be filtered with
ordinary tools, e.g.::

    grep launch_failed logs/games_error.log
    grep 'serial=12345' logs/games.log
"""

from __future__ import annotations

import logging
from decimal import Decimal

from tenants.state import get_current_tenant_id

log = logging.getLogger('games')


def _fmt(**fields) -> str:
    parts = []
    for key, value in fields.items():
        if value is None or value == '':
            continue
        if isinstance(value, Decimal):
            value = f'{value:.2f}'
        text = str(value)
        # Keep each field on one whitespace-delimited token so the line stays
        # greppable; collapse internal whitespace in free-text issues/messages.
        if any(ch.isspace() for ch in text):
            text = '"' + ' '.join(text.split()) + '"'
        parts.append(f'{key}={text}')
    return ' '.join(parts)


def _emit(level: int, event: str, **fields) -> None:
    tenant = get_current_tenant_id() or '-'
    body = _fmt(**fields)
    message = f'{event} tenant={tenant}'
    if body:
        message = f'{message} {body}'
    log.log(level, message)


# --------------------------------------------------------------------------- #
# Launch
# --------------------------------------------------------------------------- #

def launch_attempt(user_id, game_uid, game_name=None) -> None:
    _emit(logging.INFO, 'launch_attempt', user=user_id, game_uid=game_uid, game=game_name)


def launch_success(user_id, game_uid, session_uid, game_name=None, url=None) -> None:
    _emit(
        logging.INFO, 'launch_success',
        user=user_id, game_uid=game_uid, session=session_uid, game=game_name, url=url,
    )


def launch_failed(user_id, game_uid, code, issue, game_name=None) -> None:
    """A launch could not start / was interrupted — `code` + `issue` say why."""
    _emit(
        logging.WARNING, 'launch_failed',
        user=user_id, game_uid=game_uid, code=code, game=game_name, issue=issue,
    )


# --------------------------------------------------------------------------- #
# Callback settlement
# --------------------------------------------------------------------------- #

def callback_received(serial_number, member_account, game_uid) -> None:
    _emit(
        logging.INFO, 'callback_received',
        serial=serial_number, member=member_account, game_uid=game_uid,
    )


def settled(user_id, game_uid, serial_number, bet, win, balance, session_uid=None) -> None:
    net = (win or Decimal('0')) - (bet or Decimal('0'))
    outcome = 'win' if net > 0 else 'loss' if net < 0 else 'even'
    _emit(
        logging.INFO, 'settled',
        user=user_id, game_uid=game_uid, serial=serial_number, outcome=outcome,
        bet=bet, win=win, net=net, balance=balance, session=session_uid,
    )


def heartbeat(user_id, game_uid, serial_number, balance) -> None:
    _emit(
        logging.INFO, 'heartbeat',
        user=user_id, game_uid=game_uid, serial=serial_number, balance=balance,
    )


def duplicate(user_id, game_uid, serial_number, reason) -> None:
    _emit(
        logging.INFO, 'duplicate',
        user=user_id, game_uid=game_uid, serial=serial_number, reason=reason,
    )


def rejected(serial_number, member_account, game_uid, issue) -> None:
    """A callback could not be settled (bad payload, unknown account, no wallet)."""
    _emit(
        logging.WARNING, 'rejected',
        serial=serial_number, member=member_account, game_uid=game_uid, issue=issue,
    )


def decrypt_error(issue) -> None:
    _emit(logging.ERROR, 'decrypt_error', issue=issue)


def callback_error(issue) -> None:
    """Unexpected/uncaught failure while handling a callback."""
    _emit(logging.ERROR, 'callback_error', issue=issue)
