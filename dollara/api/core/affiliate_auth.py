"""Authentication for the third actor type: affiliates.

Three unrelated things live here because they are all "how do we know this
request is really from this affiliate":

* :func:`require_affiliate` — the JWT-role decorator for portal endpoints;
* TOTP — real RFC 6238 two-factor, implemented on the standard library;
* :func:`verify_signed_request` — the ``X-Aff-*`` signed contract for a
  partner's server-to-server calls.

``core/middleware.py`` is deliberately untouched. ``require_auth(['affiliate'])``
would already pass its role check (that check is a plain membership test), but
its account-exists guard is hardcoded to ``role == 'user'``, so a deleted or
suspended affiliate would keep working until their token expired. Rather than
edit a decorator every player and admin endpoint depends on, affiliates get
their own — the player auth path then carries zero regression risk from this
feature.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import secrets
import struct
import time
from urllib.parse import quote

from django.http import JsonResponse

from core.affiliate_models import Affiliate, AffiliateApiLog, AffiliateApiNonce
from services.affiliate_keys import resolve_affiliate_key
from services.signing import (SignatureError, build_signing_string, check_skew,
                              header, verify_signature)

logger = logging.getLogger('affiliate')

# --- Wire header names. Distinct from X-SA-* so the two trust domains can never
# --- be confused for one another, even by accident.
HEADER_KEY_ID = 'X-Aff-Key-Id'
HEADER_TIMESTAMP = 'X-Aff-Timestamp'
HEADER_NONCE = 'X-Aff-Nonce'
HEADER_SIGNATURE = 'X-Aff-Signature'

SIGNATURE_MAX_SKEW_SECONDS = 300

TOTP_DIGITS = 6
TOTP_PERIOD = 30
# Accept the adjacent steps so a phone clock a few seconds off still works.
TOTP_WINDOW = 1


# ---------------------------------------------------------------------------
# JWT role guard
# ---------------------------------------------------------------------------

def require_affiliate(allow_pending: bool = False):
    """Guard a portal endpoint. Sets ``request.affiliate`` on success.

    ``allow_pending`` opens the endpoint to an affiliate who has been approved
    but has not finished onboarding — needed by the onboarding endpoints
    themselves, which would otherwise be unreachable by the only people who
    need them.
    """

    def decorator(view_func):
        def wrapped(request, *args, **kwargs):
            if not request.auth:
                return JsonResponse({'error': 'Unauthorized'}, status=401)
            if request.auth.role != 'affiliate':
                return JsonResponse({'error': 'Forbidden'}, status=403)

            affiliate = Affiliate.objects.filter(id=request.auth.sub).first()
            if not affiliate:
                return JsonResponse(
                    {'error': 'Affiliate account not found. Please log in again.'},
                    status=401,
                )
            if affiliate.status == Affiliate.Status.SUSPENDED or not affiliate.is_active:
                return JsonResponse(
                    {'error': 'Your affiliate account has been suspended.'}, status=403
                )
            if affiliate.status != Affiliate.Status.APPROVED:
                return JsonResponse(
                    {'error': 'Your application is still under review.'}, status=403
                )
            if not allow_pending and not affiliate.onboarding_complete:
                return JsonResponse(
                    {'error': 'Please finish onboarding first.', 'onboarding': True},
                    status=403,
                )

            request.affiliate = affiliate
            return view_func(request, *args, **kwargs)

        wrapped.__name__ = getattr(view_func, '__name__', 'wrapped')
        wrapped.__doc__ = view_func.__doc__
        return wrapped

    return decorator


# ---------------------------------------------------------------------------
# TOTP (RFC 6238), standard library only
# ---------------------------------------------------------------------------
#
# No new dependency: TOTP is HMAC-SHA1 over a counter plus the dynamic-truncation
# step below, all of which `hmac`/`struct`/`base64` already provide. Pulling in a
# library for ~20 lines would be a worse trade than owning them.

def new_totp_secret() -> str:
    """A fresh base32 secret, in the format authenticator apps expect."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def totp_uri(secret: str, account: str, issuer: str = 'Dollara Affiliates') -> str:
    """The ``otpauth://`` URI an authenticator app scans.

    Rendered as a QR client-side rather than server-side: the secret then never
    has to survive a round trip through an image endpoint or a proxy log.
    """
    label = quote(f'{issuer}:{account}')
    return (
        f'otpauth://totp/{label}?secret={secret}'
        f'&issuer={quote(issuer)}&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_PERIOD}'
    )


def _totp_at(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
    # Dynamic truncation: the low nibble of the last byte picks the 4-byte window.
    offset = digest[-1] & 0x0F
    code = struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)


def verify_totp(secret: str, code: str, window: int = TOTP_WINDOW) -> bool:
    """Check a submitted code against the secret.

    Comparison is constant-time via :func:`hmac.compare_digest` — a timing leak
    on a six-digit code is small but entirely avoidable.
    """
    if not secret or not code:
        return False
    code = code.strip().replace(' ', '')
    if not code.isdigit() or len(code) != TOTP_DIGITS:
        return False
    counter = int(time.time()) // TOTP_PERIOD
    for drift in range(-window, window + 1):
        try:
            if hmac.compare_digest(_totp_at(secret, counter + drift), code):
                return True
        except Exception:
            # A malformed stored secret must read as "code rejected", never 500.
            logger.exception('TOTP verification failed to compute')
            return False
    return False


# ---------------------------------------------------------------------------
# Signed partner requests (X-Aff-*)
# ---------------------------------------------------------------------------

def _log_attempt(*, affiliate_id, key_id, request, status_code, result, note=None):
    """Record a verification attempt. Backs the portal's request log, so a
    partner can debug their own signing without opening a ticket."""
    try:
        AffiliateApiLog.objects.create(
            affiliate_id=affiliate_id,
            key_id=key_id or None,
            direction=AffiliateApiLog.Direction.INBOUND,
            endpoint=request.path,
            method=request.method,
            status_code=status_code,
            signature_result=result,
            note=(note or '')[:255] or None,
        )
    except Exception:
        # Audit logging must never be the reason a valid request fails.
        logger.exception('failed to write affiliate api log')


def _claim_nonce(key_id: str, nonce: str) -> bool:
    """Record ``(key_id, nonce)``; return False if it has been seen before.

    The uniqueness is enforced by the database, not by a read-then-write here,
    so two concurrent replays cannot both find the slot empty. A table rather
    than the cache because CACHES is LocMemCache: per-process, so a cache-backed
    store silently stops protecting anything as soon as there is a second worker.
    """
    from django.db import IntegrityError
    try:
        AffiliateApiNonce.objects.create(key_id=key_id, nonce=nonce[:96])
        return True
    except IntegrityError:
        return False


def verify_signed_request(request):
    """Verify an ``X-Aff-*`` signed request. Returns the resolved key.

    Raises :class:`SignatureError` with a caller-safe message on any failure.
    Every outcome, success or not, lands in ``affiliate_api_logs``.
    """
    headers = request.headers
    key_id = header(headers, HEADER_KEY_ID)
    timestamp = header(headers, HEADER_TIMESTAMP)
    nonce = header(headers, HEADER_NONCE)
    signature_b64 = header(headers, HEADER_SIGNATURE)

    if not (key_id and timestamp and nonce and signature_b64):
        _log_attempt(affiliate_id=None, key_id=key_id, request=request,
                     status_code=401, result=AffiliateApiLog.SignatureResult.MISSING,
                     note='Missing one or more X-Aff-* headers')
        raise SignatureError('Missing one or more X-Aff-* signing headers')

    key = resolve_affiliate_key(key_id)
    if not key:
        _log_attempt(affiliate_id=None, key_id=key_id, request=request,
                     status_code=401, result=AffiliateApiLog.SignatureResult.REVOKED,
                     note='Unknown, expired or revoked key')
        raise SignatureError('Unknown or revoked key')

    try:
        check_skew(timestamp, SIGNATURE_MAX_SKEW_SECONDS)
    except SignatureError as exc:
        _log_attempt(affiliate_id=key.affiliate_id, key_id=key_id, request=request,
                     status_code=401, result=AffiliateApiLog.SignatureResult.EXPIRED,
                     note=str(exc))
        raise

    # Path must include the query string, exactly as the partner signed it.
    path = request.get_full_path()
    body = request.body or b''
    message = build_signing_string(
        method=request.method, path=path, key_id=key_id,
        timestamp=timestamp, nonce=nonce, body=body,
    )
    try:
        verify_signature(public_pem=key.public_pem, message=message,
                         signature_b64=signature_b64)
    except SignatureError as exc:
        _log_attempt(affiliate_id=key.affiliate_id, key_id=key_id, request=request,
                     status_code=401, result=AffiliateApiLog.SignatureResult.INVALID,
                     note=str(exc))
        raise

    # Signature checked before the nonce is claimed, so an unauthenticated
    # caller cannot fill the nonce table with junk or burn a legitimate nonce.
    if not _claim_nonce(key_id, nonce):
        _log_attempt(affiliate_id=key.affiliate_id, key_id=key_id, request=request,
                     status_code=409, result=AffiliateApiLog.SignatureResult.REPLAY,
                     note='Nonce already used')
        raise SignatureError('Replayed request (nonce already used)')

    _log_attempt(affiliate_id=key.affiliate_id, key_id=key_id, request=request,
                 status_code=200, result=AffiliateApiLog.SignatureResult.VALID)
    return key


def require_signed_affiliate(view_func):
    """Guard a partner API endpoint. Sets ``request.affiliate`` from the key.

    Never combined with :func:`require_affiliate`: a JWT can't reach these
    routes and a signed request can't reach the portal routes, which keeps the
    two authentication paths from blurring into one another.
    """

    def wrapped(request, *args, **kwargs):
        try:
            key = verify_signed_request(request)
        except SignatureError as exc:
            return JsonResponse({'error': str(exc)}, status=401)

        affiliate = Affiliate.objects.filter(id=key.affiliate_id).first()
        if not affiliate or affiliate.status != Affiliate.Status.APPROVED:
            return JsonResponse({'error': 'Affiliate account is not active'}, status=403)

        request.affiliate = affiliate
        request.affiliate_key = key
        return view_func(request, *args, **kwargs)

    wrapped.__name__ = getattr(view_func, '__name__', 'wrapped')
    wrapped.__doc__ = view_func.__doc__
    return wrapped
