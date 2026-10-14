"""Shared primitives for the product's signed-request contracts.

Two independent trust domains sign requests to this API:

* Super Admin -> product data pulls (``X-SA-*``), verified by
  :mod:`services.webhook_verify`;
* affiliate partners -> the affiliate API (``X-Aff-*``), verified by
  :mod:`core.affiliate_auth`.

Both use the same scheme — RSA-PSS, MGF1(SHA-256), salt length = digest length,
over SHA-256 of a canonical string — so the crypto lives here once instead of
being copy-pasted per domain. What stays *per domain* is the header namespace
and the key lookup: an affiliate key must never verify a Super Admin request or
the reverse, so each caller owns its own header constants and resolver rather
than sharing a parameterised parser with a mode flag.

The canonical-string construction below is a contract shared with the Super
Admin side (``super_admin/api/docs/product_verifier_reference.py``). Changing
the order or the separators silently breaks every signed integration, so don't.
"""

from __future__ import annotations

import base64
import hashlib
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


class SignatureError(Exception):
    """Raised when a signed request fails verification."""


def body_hash(body: bytes | None) -> str:
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
        body_hash(body),
    ]).encode()


def header(headers, name: str) -> str:
    """Read a header tolerantly across dict / Django HttpHeaders / case differences."""
    if name in headers:
        return headers[name]
    lowered = {k.lower(): v for k, v in headers.items()}
    return lowered.get(name.lower(), '')


def check_skew(timestamp: str, max_seconds: int) -> None:
    """Reject timestamps outside the allowed window (clock skew + transit).

    This bounds replay exposure on its own; a nonce store closes it. Raises
    :class:`SignatureError` rather than returning a flag so a caller cannot
    forget to check the result.
    """
    try:
        skew = abs(int(time.time()) - int(timestamp))
    except (TypeError, ValueError):
        raise SignatureError('Invalid timestamp')
    if skew > max_seconds:
        raise SignatureError('Request timestamp outside allowed window (replay?)')


def verify_signature(*, public_pem: str, message: bytes, signature_b64: str) -> None:
    """Verify an RSA-PSS signature over ``message``. Raises on any failure.

    Every error mode collapses to one message on purpose: telling a caller
    whether the key failed to parse, the base64 was malformed or the signature
    simply did not match hands an attacker a probing oracle.
    """
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


def sign_message(*, private_pem: str, message: bytes) -> str:
    """Sign ``message`` with an RSA private key, returning base64.

    The outbound half of the contract. Used by tooling and tests that need to
    produce a request this API will accept.
    """
    private_key = serialization.load_pem_private_key(private_pem.encode(), password=None)
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode()
