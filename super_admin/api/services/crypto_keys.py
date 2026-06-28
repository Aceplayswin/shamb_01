"""Asymmetric key + request-signing primitives for the product webhook channel.

Phase 1 — Super Admin → Product data plane
------------------------------------------
Every product gets an RSA-2048 key pair at creation time:

- The **private key** is held by Super Admin (stored encrypted-at-rest-ish in the
  master ``product_credentials`` table). Super Admin uses it to *sign* every data
  request it sends to a product's webhook endpoint.
- The **public key** is handed to the product. The product uses it to *verify*
  that an incoming request genuinely came from Super Admin (and was not tampered
  with) before it returns any tenant data.

This replaces Super Admin reaching directly into each tenant's MySQL database.
Instead, Super Admin asks the product over HTTP, and the product is the only
thing that ever touches its own database.

The signing scheme is RSA-PSS over SHA-256 of a **canonical string** built from
the request (method, path, key id, timestamp, nonce, and a SHA-256 of the body).
The same canonical-string construction is implemented on the product side so the
two agree byte-for-byte. See ``build_signing_string`` — it is the contract.

Nothing here imports Django models, so the product (dollara) can copy this module
almost verbatim for the verify half in Phase 2.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

# Header names used on the wire. Kept here so both sides reference one source.
HEADER_KEY_ID = 'X-SA-Key-Id'
HEADER_TIMESTAMP = 'X-SA-Timestamp'
HEADER_NONCE = 'X-SA-Nonce'
HEADER_SIGNATURE = 'X-SA-Signature'
HEADER_PRODUCT = 'X-SA-Product'

# Requests older than this (clock skew + transit) are rejected by the verifier.
SIGNATURE_MAX_SKEW_SECONDS = 300

_RSA_KEY_SIZE = 2048
_PUBLIC_EXPONENT = 65537


@dataclass(frozen=True)
class KeyPair:
    """PEM-encoded RSA key pair plus a short public fingerprint."""

    public_pem: str
    private_pem: str
    fingerprint: str


def generate_key_pair() -> KeyPair:
    """Generate a fresh RSA-2048 key pair as PEM strings."""
    private_key = rsa.generate_private_key(
        public_exponent=_PUBLIC_EXPONENT, key_size=_RSA_KEY_SIZE
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()
    return KeyPair(
        public_pem=public_pem,
        private_pem=private_pem,
        fingerprint=public_key_fingerprint(public_pem),
    )


def public_key_fingerprint(public_pem: str) -> str:
    """Short, stable SHA-256 fingerprint of a public key (for display/audit)."""
    digest = hashlib.sha256(public_pem.strip().encode()).hexdigest()
    return ':'.join(digest[i:i + 4] for i in range(0, 16, 4))


def new_key_id() -> str:
    """Public, non-secret identifier of a key pair, sent in the request header."""
    return 'sak_' + secrets.token_hex(16)


def new_nonce() -> str:
    return secrets.token_hex(16)


def body_hash(body: bytes | None) -> str:
    """Hex SHA-256 of the raw request body (empty string hashes the empty body)."""
    return hashlib.sha256(body or b'').hexdigest()


def build_signing_string(
    *,
    method: str,
    path: str,
    key_id: str,
    timestamp: str,
    nonce: str,
    body: bytes | None,
) -> bytes:
    """Canonical string both sides sign/verify.

    Order and separators are part of the contract; do not reorder. ``path`` is the
    request path only (no scheme/host), so a proxy rewriting the host can't break
    verification while still binding the signature to the route + payload.
    """
    parts = [
        method.upper(),
        path,
        key_id,
        timestamp,
        nonce,
        body_hash(body),
    ]
    return '\n'.join(parts).encode()


def sign_request(
    private_pem: str,
    *,
    method: str,
    path: str,
    key_id: str,
    timestamp: str,
    nonce: str,
    body: bytes | None,
) -> str:
    """Produce the base64 RSA-PSS/SHA-256 signature for a request."""
    private_key = serialization.load_pem_private_key(private_pem.encode(), password=None)
    message = build_signing_string(
        method=method, path=path, key_id=key_id,
        timestamp=timestamp, nonce=nonce, body=body,
    )
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode()


def verify_request(
    public_pem: str,
    signature_b64: str,
    *,
    method: str,
    path: str,
    key_id: str,
    timestamp: str,
    nonce: str,
    body: bytes | None,
) -> bool:
    """Verify a request signature with the public key. Reference impl for the
    product (dollara) side — Super Admin itself only signs, but shipping the
    verifier here keeps both halves in one tested place."""
    try:
        public_key = serialization.load_pem_public_key(public_pem.encode())
        message = build_signing_string(
            method=method, path=path, key_id=key_id,
            timestamp=timestamp, nonce=nonce, body=body,
        )
        public_key.verify(
            base64.b64decode(signature_b64),
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False
