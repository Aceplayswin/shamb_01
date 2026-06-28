"""REFERENCE ONLY — drop-in verifier for the PRODUCT side (Phase 2 / dollara).

This file is NOT imported by Super Admin. It is the canonical verify-half of the
signing contract in ``services/crypto_keys.py``, ready to copy into the product
(e.g. ``dollara/api``) when Phase 2 starts. Keeping it here means both halves of
the contract are reviewed together and cannot silently drift.

Usage on the product side (framework-agnostic core):

    from product_verifier_reference import verify_incoming, SignatureError

    try:
        verify_incoming(
            public_pem=stored_public_key_for(key_id),
            method=request.method,
            path=request.full_path_with_query,   # path + "?" + query string
            headers=request.headers,             # dict-like, case-insensitive ok
            body=request.raw_body,               # bytes or None
        )
    except SignatureError as e:
        return json_error(str(e), status=401)
    # ...signature good: read the product's OWN db and return JSON...

Requires: cryptography  (pip install cryptography)
"""

from __future__ import annotations

import base64
import hashlib
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

# --- Must match services/crypto_keys.py on the Super Admin side ---
HEADER_KEY_ID = 'X-SA-Key-Id'
HEADER_TIMESTAMP = 'X-SA-Timestamp'
HEADER_NONCE = 'X-SA-Nonce'
HEADER_SIGNATURE = 'X-SA-Signature'
HEADER_PRODUCT = 'X-SA-Product'

SIGNATURE_MAX_SKEW_SECONDS = 300
WEBHOOK_BASE_PATH = '/api/v1/webhooks/super-admin'


class SignatureError(Exception):
    """Raised when an incoming Super Admin request fails verification."""


def _body_hash(body: bytes | None) -> str:
    return hashlib.sha256(body or b'').hexdigest()


def _build_signing_string(*, method, path, key_id, timestamp, nonce, body) -> bytes:
    return '\n'.join([
        method.upper(),
        path,
        key_id,
        timestamp,
        nonce,
        _body_hash(body),
    ]).encode()


def _header(headers, name: str) -> str:
    # Tolerate dict / WSGI META / case differences.
    if name in headers:
        return headers[name]
    lowered = {k.lower(): v for k, v in headers.items()}
    return lowered.get(name.lower(), '')


def verify_incoming(*, public_pem: str, method: str, path: str, headers, body: bytes | None) -> str:
    """Verify a signed Super Admin request. Returns the key_id on success.

    ``path`` MUST be the request path including the query string, exactly as
    received (the same string Super Admin signed).
    Raises :class:`SignatureError` on any problem (missing headers, stale
    timestamp, bad signature).
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

    message = _build_signing_string(
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
    # exposure; the nonce store closes it.
    return key_id
