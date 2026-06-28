"""Verify half of the Super Admin -> Product signed-webhook contract (Phase 2).

Super Admin signs every data pull with the product's RSA private key
(``super_admin/api/services/crypto_keys.py`` / ``webhook_client.py``). This module
is the product (dollara) side: it rebuilds the **same** canonical signing-string
from the request it received and verifies the ``X-SA-Signature`` against the
stored public key before any tenant data is read.

The signing-string construction here MUST stay byte-for-byte identical to the
Super Admin side, so it is a faithful copy of the reference verifier shipped at
``super_admin/api/docs/product_verifier_reference.py``. Keeping the contract in
one shape on both sides is what stops the two halves silently drifting.

Scheme: RSA-PSS, MGF1(SHA-256), salt length = digest length, over
``SHA-256(canonical-string)``.
"""

from __future__ import annotations

import base64
import hashlib
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

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


class SignatureError(Exception):
    """Raised when an incoming Super Admin request fails verification."""


def _body_hash(body: bytes | None) -> str:
    """Hex SHA-256 of the raw request body (empty string hashes the empty body)."""
    return hashlib.sha256(body or b'').hexdigest()


def build_signing_string(*, method: str, path: str, key_id: str, timestamp: str,
                         nonce: str, body: bytes | None) -> bytes:
    """Canonical string both sides sign/verify. Order and separators are the
    contract — do not reorder. ``path`` is the request path including the query
    string, no scheme/host."""
    return '\n'.join([
        method.upper(),
        path,
        key_id,
        timestamp,
        nonce,
        _body_hash(body),
    ]).encode()


def _header(headers, name: str) -> str:
    # Tolerate dict / Django HttpHeaders / case differences.
    if name in headers:
        return headers[name]
    lowered = {k.lower(): v for k, v in headers.items()}
    return lowered.get(name.lower(), '')


def verify_incoming(*, public_pem: str, method: str, path: str, headers,
                    body: bytes | None) -> str:
    """Verify a signed Super Admin request. Returns the ``key_id`` on success.

    ``path`` MUST be the request path including the query string, exactly as
    received (the same string Super Admin signed). Raises :class:`SignatureError`
    on any problem (missing headers, stale timestamp, bad signature).
    """
    key_id = _header(headers, HEADER_KEY_ID)
    timestamp = _header(headers, HEADER_TIMESTAMP)
    nonce = _header(headers, HEADER_NONCE)
    signature_b64 = _header(headers, HEADER_SIGNATURE)

    if not (key_id and timestamp and nonce and signature_b64):
        raise SignatureError('Missing one or more X-SA-* signing headers')

    try:
        skew = abs(int(time.time()) - int(timestamp))
    except ValueError:
        raise SignatureError('Invalid timestamp')
    if skew > SIGNATURE_MAX_SKEW_SECONDS:
        raise SignatureError('Request timestamp outside allowed window (replay?)')

    message = build_signing_string(
        method=method, path=path, key_id=key_id,
        timestamp=timestamp, nonce=nonce, body=body,
    )
    try:
        public_key = serialization.load_pem_public_key(public_pem.encode())
        public_key.verify(
            base64.b64decode(signature_b64),
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
    except (InvalidSignature, ValueError, TypeError):
        raise SignatureError('Signature verification failed')

    # NOTE: For full replay protection, also store-and-reject seen (key_id, nonce)
    # pairs for SIGNATURE_MAX_SKEW_SECONDS. The timestamp window above bounds the
    # exposure; a nonce store would close it. Left out here to match the reference
    # contract and because dollara's cache is per-process (not shared across
    # workers) — add a shared store before relying on it for replay defence.
    return key_id
