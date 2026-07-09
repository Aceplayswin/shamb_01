"""Control-plane client: fetch this product's config from Super Admin over HTTP.

dollara used to read its control-plane data (product identity, branding, live
theme, webhook public keys) straight out of Super Admin's master database. It no
longer connects to that database at all — instead it pulls the same data from::

    GET {SUPER_ADMIN_URL}/api/v1/products/<slug>/config
        X-Product-Token: <shared secret>

authenticated with a shared secret (``PRODUCT_CONFIG_TOKEN``). The response is
cached in-process so tenant resolution (which runs on every request) doesn't make
an HTTP call each time, and a *last-known-good* copy is kept so a brief Super
Admin outage doesn't take dollara down.

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

# Cache keys. ``fresh`` expires quickly so config changes propagate; ``lkg`` (last
# known good) lives long and is served if a fetch fails; ``cooldown`` throttles
# retries while Super Admin is unreachable so we don't hammer it every request.
_FRESH_KEY = 'control_plane:config:{slug}'
_LKG_KEY = 'control_plane:config_lkg:{slug}'
_COOLDOWN_KEY = 'control_plane:config_cooldown:{slug}'

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


def _http_fetch(slug: str) -> dict | None:
    """Fetch a product's config from Super Admin. Returns ``None`` on any error."""
    base = _base_url()
    if not base:
        logger.warning('control_plane: SUPER_ADMIN_URL not configured')
        return None
    url = f'{base}/api/v1/products/{slug}/config'
    req = urllib.request.Request(url, method='GET')
    req.add_header('User-Agent', 'dollara-control-plane/1.0')
    req.add_header('Accept', 'application/json')
    token = _token()
    if token:
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


def get_product_config(slug: str) -> dict | None:
    """Return the cached control-plane config for ``slug`` (fetching if stale).

    Serves the last-known-good copy when Super Admin is unreachable so the product
    keeps running through a brief control-plane outage.
    """
    if not slug:
        return None

    fresh_key = _FRESH_KEY.format(slug=slug)
    cached = cache.get(fresh_key)
    if cached is not None:
        return cached

    lkg_key = _LKG_KEY.format(slug=slug)
    cooldown_key = _COOLDOWN_KEY.format(slug=slug)

    # Recently failed — don't retry yet; serve last-known-good if we have it.
    if cache.get(cooldown_key):
        return cache.get(lkg_key)

    config = _http_fetch(slug)
    if config is not None:
        cache.set(fresh_key, config, _fresh_ttl())
        cache.set(lkg_key, config, _LKG_TTL)
        return config

    # Fetch failed: back off briefly and fall back to the last good config.
    cache.set(cooldown_key, True, _COOLDOWN_TTL)
    return cache.get(lkg_key)


def invalidate(slug: str) -> None:
    """Drop cached config for ``slug`` (forces a fresh fetch next call)."""
    if not slug:
        return
    cache.delete(_FRESH_KEY.format(slug=slug))
    cache.delete(_COOLDOWN_KEY.format(slug=slug))


def find_credential(key_id: str, slug: str) -> dict | None:
    """Find the credential dict matching ``key_id`` in ``slug``'s config, or None."""
    if not (key_id and slug):
        return None
    config = get_product_config(slug)
    if not config:
        return None
    for cred in config.get('credentials', []):
        if cred.get('key_id') == key_id:
            return cred
    return None
