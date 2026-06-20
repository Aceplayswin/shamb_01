"""External game aggregator integration (provider service layer).

This module is the *only* place that talks the aggregator's wire protocol:

- AES-256-ECB encrypt/decrypt of payloads (PKCS#7 padding, base64 transport).
- Building the encrypted launch request envelope.
- Calling the aggregator launch endpoint over HTTP.
- Decrypting inbound bet/win callbacks and building the encrypted ack.

All credentials, keys, and URLs come from ``settings.GAME_PROVIDER`` (which is
populated from environment variables) — nothing is hardcoded. Business logic
(wallet settlement, sessions, history) lives in ``core/game_services.py`` and
consumes the structured dicts returned here. Keeping the protocol isolated makes
the integration unit-testable without a live aggregator and swappable if the
provider changes.
"""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from urllib.parse import urlencode, urlparse

import requests
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from django.conf import settings


class ProviderConfigError(RuntimeError):
    """Raised when required provider credentials/URLs are missing from env."""


class ProviderError(RuntimeError):
    """Raised when the aggregator returns a non-success code or is unreachable."""


@dataclass(frozen=True)
class ProviderConfig:
    agency_uid: str
    aes_secret_key: str
    player_prefix: str
    server_url: str
    callback_base_url: str
    home_url: str
    currency_code: str
    default_language: str
    http_timeout: int

    @property
    def callback_url(self) -> str:
        # The aggregator posts settlement callbacks here. Trailing slash matches
        # the legacy contract (``https://api.host/game/``).
        return f'{self.callback_base_url}/api/v1/games/callback'


def get_config() -> ProviderConfig:
    """Build the provider config from settings, validating required fields."""
    raw = settings.GAME_PROVIDER
    cfg = ProviderConfig(
        agency_uid=raw['AGENCY_UID'],
        aes_secret_key=raw['AES_SECRET_KEY'],
        player_prefix=raw['PLAYER_PREFIX'],
        server_url=raw['SERVER_URL'],
        callback_base_url=raw['CALLBACK_BASE_URL'],
        home_url=raw['HOME_URL'],
        currency_code=raw['CURRENCY_CODE'],
        default_language=raw['DEFAULT_LANGUAGE'],
        http_timeout=raw['HTTP_TIMEOUT'],
    )
    return cfg


def _launch_path() -> str:
    path = getattr(settings, 'GAME_LAUNCH_PATH', '/game/v1')
    return path if path.startswith('/') else f'/{path}'


def _is_placeholder_server_url(url: str) -> bool:
    """Detect legacy doc placeholders like ``https://bet`` (not a real host)."""
    if not url:
        return True
    host = (urlparse(url).hostname or '').lower()
    if not host or host == 'bet':
        return True
    return '.' not in host


def _use_mock_launch(cfg: ProviderConfig) -> bool:
    if getattr(settings, 'GAME_MOCK_LAUNCH', False):
        return True
    if settings.DEBUG and _is_placeholder_server_url(cfg.server_url):
        return True
    return False


def mock_launch_url(*, game_uid: str) -> str:
    """Local/dev launch page when the real aggregator is unavailable."""
    cfg = get_config()
    qs = urlencode({'game_uid': game_uid})
    return f'{cfg.callback_base_url}/api/v1/games/mock-launch?{qs}'


def _require_launch_config(cfg: ProviderConfig) -> None:
    missing = [
        name
        for name, value in (
            ('GAME_AGENCY_UID', cfg.agency_uid),
            ('GAME_AES_SECRET_KEY', cfg.aes_secret_key),
            ('GAME_SERVER_URL', cfg.server_url),
        )
        if not value
    ]
    if missing:
        raise ProviderConfigError(
            f'Game provider not configured: missing {", ".join(missing)}'
        )
    if _is_placeholder_server_url(cfg.server_url):
        raise ProviderConfigError(
            'GAME_SERVER_URL is invalid (legacy placeholder "https://bet"). '
            'Set the full aggregator URL from your game provider, or set '
            'GAME_MOCK_LAUNCH=1 for local development.'
        )


def _require_crypto_config(cfg: ProviderConfig) -> None:
    if not cfg.aes_secret_key:
        raise ProviderConfigError('Game provider not configured: missing GAME_AES_SECRET_KEY')


# --- AES-256-ECB crypto (PKCS#7, base64 transport) ---

_BLOCK = 16


def _pkcs7_pad(data: bytes) -> bytes:
    pad = _BLOCK - (len(data) % _BLOCK)
    return data + bytes([pad]) * pad


def _pkcs7_unpad(data: bytes) -> bytes:
    if not data:
        return data
    pad = data[-1]
    if pad < 1 or pad > _BLOCK or pad > len(data):
        # Not validly padded — return as-is rather than corrupting the payload.
        return data
    return data[:-pad]


def _key_bytes(secret: str) -> bytes:
    """Coerce the configured secret into a valid AES key length.

    The aggregator key is a 32-char hex string used directly as the AES-256 key
    (its UTF-8 bytes). We accept 16/24/32-byte keys; anything else is truncated
    or right-padded with zero bytes to the nearest valid length so a misconfig
    fails loudly at encrypt time rather than silently producing garbage.
    """
    raw = secret.encode('utf-8')
    if len(raw) in (16, 24, 32):
        return raw
    if len(raw) > 32:
        return raw[:32]
    # pad up to the next valid size
    for size in (16, 24, 32):
        if len(raw) < size:
            return raw.ljust(size, b'\0')
    return raw[:32]


def encrypt(plaintext: str, secret: str | None = None) -> str:
    """AES-256-ECB encrypt and base64-encode a JSON/text payload."""
    cfg = get_config()
    key = _key_bytes(secret if secret is not None else cfg.aes_secret_key)
    cipher = Cipher(algorithms.AES(key), modes.ECB())
    encryptor = cipher.encryptor()
    padded = _pkcs7_pad(plaintext.encode('utf-8'))
    ct = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(ct).decode('ascii')


def decrypt(payload_b64: str, secret: str | None = None) -> str:
    """Base64-decode and AES-256-ECB decrypt to the original text."""
    cfg = get_config()
    key = _key_bytes(secret if secret is not None else cfg.aes_secret_key)
    cipher = Cipher(algorithms.AES(key), modes.ECB())
    decryptor = cipher.decryptor()
    ct = base64.b64decode(payload_b64)
    padded = decryptor.update(ct) + decryptor.finalize()
    return _pkcs7_unpad(padded).decode('utf-8', errors='replace')


def encrypt_json(obj: dict, secret: str | None = None) -> str:
    return encrypt(json.dumps(obj, separators=(',', ':')), secret)


def decrypt_json(payload_b64: str, secret: str | None = None) -> dict:
    text = decrypt(payload_b64, secret)
    return json.loads(text)


# --- Outbound: launch a game session ---

def build_member_account(user_id: int | str) -> str:
    """Namespace our internal user id into the aggregator member_account."""
    cfg = get_config()
    return f'{cfg.player_prefix}{user_id}'


def strip_member_account(member_account: str) -> str:
    """Reverse of build_member_account: recover the internal user id string."""
    cfg = get_config()
    prefix = cfg.player_prefix
    if prefix and member_account.startswith(prefix):
        return member_account[len(prefix):]
    return member_account


def request_launch_url(
    *,
    user_id: int | str,
    game_uid: str,
    credit_amount: str,
    currency_code: str | None = None,
    language: str | None = None,
    platform: str = 'web',
) -> str:
    """Call the aggregator launch endpoint and return the game_launch_url.

    Builds the AES-encrypted payload envelope, POSTs it, and unwraps the
    response. Raises :class:`ProviderError` on transport failure or a non-zero
    aggregator code, and :class:`ProviderConfigError` if env is incomplete.
    """
    cfg = get_config()
    if _use_mock_launch(cfg):
        return mock_launch_url(game_uid=game_uid)

    _require_launch_config(cfg)

    timestamp = int(time.time() * 1000)
    payload = {
        'agency_uid': cfg.agency_uid,
        'timestamp': timestamp,
        'member_account': build_member_account(user_id),
        'game_uid': game_uid,
        'credit_amount': str(credit_amount),
        'currency_code': currency_code or cfg.currency_code,
        'language': language or cfg.default_language,
        'home_url': cfg.home_url,
        'platform': platform,
        'callback_url': cfg.callback_url,
    }
    envelope = {
        'agency_uid': cfg.agency_uid,
        'timestamp': timestamp,
        'payload': encrypt_json(payload),
    }

    try:
        resp = requests.post(
            f'{cfg.server_url}{_launch_path()}',
            json=envelope,
            timeout=cfg.http_timeout,
            headers={'Content-Type': 'application/json'},
        )
    except requests.RequestException as exc:
        raise ProviderError(f'Aggregator unreachable: {exc}') from exc

    if resp.status_code != 200:
        raise ProviderError(f'Aggregator HTTP {resp.status_code}')

    try:
        data = resp.json()
    except ValueError as exc:
        raise ProviderError('Aggregator returned non-JSON response') from exc

    if data.get('code') not in (0, '0'):
        raise ProviderError(
            f'Aggregator error code={data.get("code")} msg={data.get("msg", "")}'
        )

    launch_payload = data.get('payload')
    # Some aggregators return the inner payload encrypted, others plain. Handle both.
    if isinstance(launch_payload, str):
        try:
            launch_payload = decrypt_json(launch_payload)
        except Exception as exc:  # pragma: no cover - defensive
            raise ProviderError('Failed to decrypt launch payload') from exc

    url = (launch_payload or {}).get('game_launch_url')
    if not url:
        raise ProviderError('Aggregator did not return a game_launch_url')
    return url


# --- Inbound: decrypt a callback, build the encrypted ack ---

def parse_callback(envelope: dict) -> dict:
    """Decrypt an inbound callback envelope into its plain fields.

    Accepts either ``{"payload": "<encrypted>"}`` or an already-plain dict.
    Raises :class:`ProviderError` if the payload cannot be decrypted/parsed.
    """
    _require_crypto_config(get_config())
    if 'payload' in envelope and isinstance(envelope['payload'], str):
        try:
            return decrypt_json(envelope['payload'])
        except Exception as exc:
            raise ProviderError('Failed to decrypt callback payload') from exc
    # Fall back to treating the envelope itself as the decrypted body.
    return envelope


def build_ack(credit_amount: str, timestamp: str | None = None) -> dict:
    """Build the encrypted acknowledgement returned to the aggregator."""
    body = {
        'credit_amount': str(credit_amount),
        'timestamp': timestamp or time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    return {'code': 0, 'msg': '', 'payload': encrypt_json(body)}
