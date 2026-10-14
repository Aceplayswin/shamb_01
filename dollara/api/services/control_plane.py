"""Control-plane client: fetch this product's config from Super Admin over HTTP.

dollara used to read its control-plane data (product identity, branding, live
theme, webhook public keys) straight out of Super Admin's master database. It no
longer connects to that database at all — instead it pulls the same data from::

    GET {SUPER_ADMIN_URL}/api/v1/product/config
        X-Product-Token: <api_key>

Key-oriented: dollara serves a single product and identifies it purely by its
``PRODUCT_CONFIG_TOKEN`` (the product's api_key). Super Admin resolves *which*
product the key belongs to and returns its config — no slug is exchanged, so the
two sides communicate iff dollara holds a valid key. The response is cached
in-process so tenant resolution (which runs on every request) doesn't make an HTTP
call each time, and a *last-known-good* copy is kept so a brief Super Admin outage
doesn't take dollara down.

Response shape (see ``super_admin/api/tenants/views.py::product_config``)::

    {
      "slug": "dollara",
      "product":  {"id", "slug", "name", "status"},
      "branding": {...branding fields..., "slug"},
      "theme":    {"active_theme", "known_themes": [...]},
      "credentials": [{"key_id", "public_pem", "fingerprint", "is_active",
                       "delivered_to_product_at"}]
    }
"""

from __future__ import annotations

import json
import logging
import ssl
import urllib.error
import urllib.request

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cache keys. This instance serves a single product (identified by its api_key),
# so one cache slot suffices. ``fresh`` expires quickly so config changes
# propagate; ``lkg`` (last known good) lives long and is served if a fetch fails;
# ``cooldown`` throttles retries while Super Admin is unreachable so we don't
# hammer it every request.
_FRESH_KEY = 'control_plane:config'
_LKG_KEY = 'control_plane:config_lkg'
_COOLDOWN_KEY = 'control_plane:config_cooldown'

_LKG_TTL = 24 * 60 * 60  # keep the last good config for a day
_COOLDOWN_TTL = 10       # seconds to wait before retrying after a failure

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


def _base_url() -> str:
    return (getattr(settings, 'SUPER_ADMIN_URL', '') or '').rstrip('/')


def _token() -> str:
    return getattr(settings, 'PRODUCT_CONFIG_TOKEN', '') or ''


def _timeout() -> int:
    return int(getattr(settings, 'CONTROL_PLANE_HTTP_TIMEOUT', 10))


def _fresh_ttl() -> int:
    return int(getattr(settings, 'CONTROL_PLANE_CACHE_TTL', 60))


def _http_fetch() -> dict | None:
    """Fetch this product's config from Super Admin, identifying it by api_key.

    Returns ``None`` on any error — including a missing key, so the two sides only
    communicate when dollara actually holds a token.
    """
    base = _base_url()
    if not base:
        logger.warning('control_plane: SUPER_ADMIN_URL not configured')
        return None
    token = _token()
    if not token:
        logger.warning('control_plane: PRODUCT_CONFIG_TOKEN not set — cannot pull config')
        return None
    url = f'{base}/api/v1/product/config'
    req = urllib.request.Request(url, method='GET')
    req.add_header('User-Agent', 'dollara-control-plane/1.0')
    req.add_header('Accept', 'application/json')
    req.add_header('X-Product-Token', token)
    try:
        with urllib.request.urlopen(req, timeout=_timeout(), context=_SSL_CTX) as resp:
            payload = resp.read()
        return json.loads(payload) if payload else None
    except urllib.error.HTTPError as e:
        logger.warning('control_plane: %s returned HTTP %s', url, e.code)
        return None
    except urllib.error.URLError as e:
        logger.warning('control_plane: could not reach %s: %s', url, e.reason)
        return None
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning('control_plane: invalid JSON from %s: %s', url, e)
        return None
    except TimeoutError as e:
        # A read timeout raises a bare TimeoutError (not wrapped in URLError),
        # so it must be caught explicitly or it would 500 the whole request.
        logger.warning('control_plane: timed out reading %s: %s', url, e)
        return None
    except OSError as e:
        # Any other socket/connection-layer error (reset, DNS, TLS) — treat as
        # unreachable so tenant resolution degrades to last-known-good.
        logger.warning('control_plane: transport error for %s: %s', url, e)
        return None


def get_product_config() -> dict | None:
    """Return this product's cached control-plane config (fetching if stale).

    Identified by api_key, not slug. Serves the last-known-good copy when Super
    Admin is unreachable so the product keeps running through a brief outage.
    """
    cached = cache.get(_FRESH_KEY)
    if cached is not None:
        return cached

    # Recently failed — don't retry yet; serve last-known-good if we have it.
    if cache.get(_COOLDOWN_KEY):
        return cache.get(_LKG_KEY)

    config = _http_fetch()
    if config is not None:
        cache.set(_FRESH_KEY, config, _fresh_ttl())
        cache.set(_LKG_KEY, config, _LKG_TTL)
        return config

    # Fetch failed: back off briefly and fall back to the last good config.
    cache.set(_COOLDOWN_KEY, True, _COOLDOWN_TTL)
    return cache.get(_LKG_KEY)


def invalidate() -> None:
    """Drop the cached config (forces a fresh fetch next call)."""
    cache.delete(_FRESH_KEY)
    cache.delete(_COOLDOWN_KEY)


def find_credential(key_id: str) -> dict | None:
    """Find the credential dict matching ``key_id`` in this product's config."""
    if not key_id:
        return None
    config = get_product_config()
    if not config:
        return None
    for cred in config.get('credentials', []):
        if cred.get('key_id') == key_id:
            return cred
    return None
