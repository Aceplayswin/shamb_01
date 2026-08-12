"""Verify half of the Super Admin -> Product signed-webhook contract (Phase 2).

Super Admin signs every data pull with the product's RSA private key
(``super_admin/api/services/crypto_keys.py`` / ``webhook_client.py``). This module
is the product (dollara) side: it rebuilds the **same** canonical signing-string
from the request it received and verifies the ``X-SA-Signature`` against the
stored public key before any tenant data is read.

The crypto primitives now live in :mod:`services.signing`, shared with the
affiliate partner API. What stays here is everything specific to *this* trust
domain: the ``X-SA-*`` header names, the skew window, and the mounted base path.
An affiliate key must never verify a Super Admin request, so the two domains
keep separate header constants and separate key resolvers rather than sharing a
parser with a mode flag.

The signing-string construction MUST stay byte-for-byte identical to the Super
Admin side and to the reference verifier shipped at
``super_admin/api/docs/product_verifier_reference.py``. Keeping the contract in
one shape on both sides is what stops the two halves silently drifting.

Scheme: RSA-PSS, MGF1(SHA-256), salt length = digest length, over
``SHA-256(canonical-string)``.
"""

from __future__ import annotations

from services.signing import (SignatureError, build_signing_string, check_skew,
                              header, verify_signature)

# --- Wire header names. Must match services/crypto_keys.py on the Super Admin side. ---
HEADER_KEY_ID = 'X-SA-Key-Id'
HEADER_TIMESTAMP = 'X-SA-Timestamp'
HEADER_NONCE = 'X-SA-Nonce'
HEADER_SIGNATURE = 'X-SA-Signature'
HEADER_PRODUCT = 'X-SA-Product'

# Requests older than this (clock skew + transit) are rejected as possible replays.
SIGNATURE_MAX_SKEW_SECONDS = 300

# Path prefix Super Admin signs and this product mounts. Part of the canonical
# string, so both sides must agree on it exactly.
WEBHOOK_BASE_PATH = '/api/v1/webhooks/super-admin'

# Re-exported so existing importers of this module keep working unchanged.
__all__ = [
    'HEADER_KEY_ID', 'HEADER_TIMESTAMP', 'HEADER_NONCE', 'HEADER_SIGNATURE',
    'HEADER_PRODUCT', 'SIGNATURE_MAX_SKEW_SECONDS', 'WEBHOOK_BASE_PATH',
    'SignatureError', 'build_signing_string', 'verify_incoming',
]


def verify_incoming(*, public_pem: str, method: str, path: str, headers,
                    body: bytes | None) -> str:
    """Verify a signed Super Admin request. Returns the ``key_id`` on success.

    ``path`` MUST be the request path including the query string, exactly as
    received (the same string Super Admin signed). Raises :class:`SignatureError`
    on any problem (missing headers, stale timestamp, bad signature).
    """
    key_id = header(headers, HEADER_KEY_ID)
    timestamp = header(headers, HEADER_TIMESTAMP)
    nonce = header(headers, HEADER_NONCE)
    signature_b64 = header(headers, HEADER_SIGNATURE)

    if not (key_id and timestamp and nonce and signature_b64):
        raise SignatureError('Missing one or more X-SA-* signing headers')

    check_skew(timestamp, SIGNATURE_MAX_SKEW_SECONDS)

    message = build_signing_string(
        method=method, path=path, key_id=key_id,
        timestamp=timestamp, nonce=nonce, body=body,
    )
    verify_signature(public_pem=public_pem, message=message, signature_b64=signature_b64)

    # NOTE: For full replay protection, also store-and-reject seen (key_id, nonce)
    # pairs for SIGNATURE_MAX_SKEW_SECONDS. The timestamp window above bounds the
    # exposure; a nonce store would close it. Left out here to match the reference
    # contract and because dollara's cache is per-process (not shared across
    # workers). The affiliate contract, which is a lower-trust externally
    # distributed surface, does implement one — see core/affiliate_auth.py, which
    # persists nonces in a table precisely because the cache cannot be trusted.
    return key_id
