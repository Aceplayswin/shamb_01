"""Signed HTTP client for the P2P·PAY merchant API (UPI / bank deposits).

Every request carries X-Api-Key (public key), X-Timestamp (unix seconds) and
X-Signature = hex HMAC-SHA256 of "<timestamp>.<raw body>" with the secret. The
exact JSON string that is signed is the one sent. A GET signs "<timestamp>.".
Webhooks are signed the same way (x-p2p-timestamp / x-p2p-signature).

The secret stays on this API; the browser only ever gets the checkoutUrl.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from decimal import Decimal
from urllib.parse import quote, urlsplit

import requests
from django.conf import settings

logger = logging.getLogger('p2ppay')

# Webhook / request timestamps further than this from our clock are refused.
SIGNATURE_TOLERANCE_SECONDS = 300

# Gateway errors that mean our account/keys are wrong, not the player's input.
# The player gets a neutral "unavailable" line; the operator gets the log.
_ACCOUNT_ERRORS = {
    'INVALID_CREDENTIALS',
    'CLIENT_NOT_LIVE',
    'CLIENT_NOT_CONFIGURED',
    'DUPLICATE_CLIENT_REFERENCE',
}


class P2PPayError(Exception):
    """A P2P·PAY call failed.

    ``status`` is the HTTP status to answer the player with, ``code`` the
    gateway's error code, and ``ambiguous`` is True when we cannot tell whether
    the gateway acted on the request (timeout, network error, 5xx) — the docs
    say to look the order up by clientRef before giving up on it.
    """

    def __init__(
        self,
        message: str,
        status: int = 502,
        code: str | None = None,
        ambiguous: bool = False,
    ):
        super().__init__(message)
        self.status = status
        self.code = code
        self.ambiguous = ambiguous


def _cfg() -> dict:
    return getattr(settings, 'P2PPAY', {}) or {}


def api_url() -> str:
    return str(_cfg().get('API_URL') or '').rstrip('/')


def is_configured() -> bool:
    cfg = _cfg()
    return bool(
        api_url()
        and str(cfg.get('PUBLIC_KEY') or '').strip()
        and str(cfg.get('SECRET') or '').strip()
    )


def _keys() -> tuple[str, str]:
    cfg = _cfg()
    key = str(cfg.get('PUBLIC_KEY') or '').strip()
    secret = str(cfg.get('SECRET') or '').strip()
    if not key or not secret or not api_url():
        raise P2PPayError(
            'This payment method is not configured.',
            status=503,
            code='NOT_CONFIGURED',
        )
    return key, secret


def sign(secret: str, timestamp: str, raw_body: str | bytes) -> str:
    """Hex HMAC-SHA256 of "<timestamp>.<raw body>" — over the exact bytes."""
    if isinstance(raw_body, str):
        raw_body = raw_body.encode('utf-8')
    return hmac.new(
        secret.encode('utf-8'),
        str(timestamp).encode('utf-8') + b'.' + raw_body,
        hashlib.sha256,
    ).hexdigest()


def format_amount(amount) -> str:
    """Rupees as a 2-decimal string, the format the API expects ("1500.00")."""
    return str(Decimal(str(amount)).quantize(Decimal('0.01')))


def checkout_url_for(order_id: str) -> str:
    """Hosted checkout page for an order.

    POST /orders returns checkoutUrl, but GET /orders does not; this rebuilds
    it (https://<gateway host>/pay/<orderId>) for the timeout-recovery path.
    """
    parts = urlsplit(api_url())
    return f'{parts.scheme}://{parts.netloc}/pay/{quote(str(order_id), safe="")}'


def _rupees(value) -> str:
    try:
        return f'₹{Decimal(str(value)):,.0f}'
    except Exception:
        return f'₹{value}'


def _player_message(code: str, error: dict, fallback: str) -> str:
    """Turn a gateway error into something the player can act on."""
    if code == 'NO_TRADER_AVAILABLE':
        can_take = error.get('canTake')
        if can_take:
            return (
                f'This payment method cannot take that amount right now. '
                f'Try {_rupees(can_take)} or less, or choose another method.'
            )
        return (
            'This payment method is busy right now. Please try again shortly '
            'or choose another method.'
        )
    if code == 'AMOUNT_OUT_OF_LIMITS':
        lo, hi = error.get('min'), error.get('max')
        if lo is not None and hi is not None:
            return f'Amount must be between {_rupees(lo)} and {_rupees(hi)} for this method.'
        return 'Amount is outside the limits for this method.'
    if code == 'VALIDATION_ERROR':
        fields = error.get('fields') or []
        if fields and isinstance(fields[0], dict) and fields[0].get('message'):
            return str(fields[0]['message'])
        return fallback
    if code in _ACCOUNT_ERRORS:
        return 'This payment method is temporarily unavailable. Please choose another method.'
    return 'Payment gateway error. Please try again.'


def _raise_for(resp: requests.Response, payload) -> None:
    error = payload.get('error') if isinstance(payload, dict) else None
    if not isinstance(error, dict):
        error = {}
    code = str(error.get('code') or f'HTTP_{resp.status_code}')
    message = str(error.get('message') or resp.reason or 'Payment gateway request failed.')
    logger.warning(
        'p2ppay-error status=%s code=%s message=%s ref=%s',
        resp.status_code, code, message, error.get('ref') or '-',
    )
    ambiguous = resp.status_code >= 500
    if code in _ACCOUNT_ERRORS:
        status = 503
    elif code == 'NOT_FOUND':
        status = 404
    elif resp.status_code in (400, 409, 422):
        status = 400 if resp.status_code == 422 else resp.status_code
    else:
        status = 502
    raise P2PPayError(
        _player_message(code, error, message),
        status=status,
        code=code,
        ambiguous=ambiguous,
    )


def _request(method: str, path: str, body: dict | None = None) -> dict:
    key, secret = _keys()
    raw = json.dumps(body, separators=(',', ':')) if body is not None else ''
    timestamp = str(int(time.time()))
    headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': key,
        'X-Timestamp': timestamp,
        'X-Signature': sign(secret, timestamp, raw),
    }
    timeout = int(_cfg().get('HTTP_TIMEOUT') or 30)
    try:
        resp = requests.request(
            method,
            f'{api_url()}{path}',
            # Send the exact bytes that were signed.
            data=raw.encode('utf-8') if body is not None else None,
            headers=headers,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning('p2ppay-unreachable %s %s: %s', method, path, exc)
        raise P2PPayError(
            'Could not reach the payment gateway. Please try again.',
            status=502,
            code='UNREACHABLE',
            ambiguous=True,
        ) from exc
    try:
        payload = resp.json()
    except ValueError:
        payload = {}
    if not resp.ok:
        _raise_for(resp, payload)
    return payload if isinstance(payload, dict) else {}


def create_order(
    *,
    amount,
    client_ref: str,
    success_url: str | None = None,
    failure_url: str | None = None,
    note: str | None = None,
) -> dict:
    """POST /orders → {orderId, clientRef, mode, amount, status, checkoutUrl, …}."""
    body = {'amount': format_amount(amount), 'clientRef': client_ref}
    if success_url:
        body['successUrl'] = success_url
    if failure_url:
        body['failureUrl'] = failure_url
    if note:
        body['note'] = str(note)[:200]
    return _request('POST', '/orders', body)


def get_order(order_ref: str) -> dict:
    """GET /orders/{orderId or clientRef} — same fields, without checkoutUrl."""
    return _request('GET', f'/orders/{quote(str(order_ref), safe="")}')


def verify_webhook(raw_body: bytes, timestamp: str, signature: str) -> bool:
    """Check x-p2p-signature over the raw body, and the timestamp's freshness."""
    try:
        _, secret = _keys()
    except P2PPayError:
        return False
    if not timestamp or not signature:
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    if abs(time.time() - ts) > SIGNATURE_TOLERANCE_SECONDS:
        return False
    expected = sign(secret, timestamp, raw_body)
    return hmac.compare_digest(expected, signature.strip().lower())
