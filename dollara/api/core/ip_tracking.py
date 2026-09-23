"""Client IP capture, login tracing, and blocked-IP enforcement.

One place owns "what is this request's IP" so every caller agrees. Before this
module the answer was spelled five different ways across views/services, some
reading ``REMOTE_ADDR`` alone — which behind a proxy records the proxy, so every
player shared one address and IP rules could never match.

The block list is consulted through a short-lived cache: the check runs on
sign-in and sign-up, and re-reading the table on each of those is wasteful when
the rules change a few times a day.
"""

import ipaddress
import logging

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# How long a block decision may be stale. Short enough that an operator
# blocking an abusive address sees it take effect while they are still watching.
_CACHE_SECONDS = 30
_CACHE_KEY = 'blocked_ip_rules_v1'

# Headers to consult, in order of preference. X-Forwarded-For is the de-facto
# standard; the others cover the CDNs/proxies this stack has run behind.
_FORWARD_HEADERS = (
    'HTTP_CF_CONNECTING_IP',
    'HTTP_TRUE_CLIENT_IP',
    'HTTP_X_REAL_IP',
    'HTTP_X_FORWARDED_FOR',
)


def normalize_ip(value) -> str | None:
    """Return a canonical textual IP, or ``None`` if it isn't one.

    Normalising matters for matching: ``::ffff:1.2.3.4`` and ``1.2.3.4`` are the
    same client, and an operator who blocks one means both. IPv6 also has many
    spellings of one address, so rules would silently miss without this.
    """
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    # Strip a port, which some proxies append ("1.2.3.4:5678", "[::1]:80").
    if text.startswith('['):
        end = text.find(']')
        if end != -1:
            text = text[1:end]
    elif text.count(':') == 1 and '.' in text:
        text = text.split(':', 1)[0]
    try:
        addr = ipaddress.ip_address(text)
    except ValueError:
        return None
    # An IPv4 address tunnelled over IPv6 is that IPv4 address.
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return str(addr)


def get_client_ip(request) -> str | None:
    """The best available address for whoever sent this request.

    Proxy headers are client-controlled, so a value is only accepted if it
    parses as a real IP; a forged header cannot inject arbitrary text into the
    audit trail or the block list.
    """
    if request is None:
        return None
    meta = getattr(request, 'META', None) or {}
    for header in _FORWARD_HEADERS:
        raw = meta.get(header)
        if not raw:
            continue
        # X-Forwarded-For is a chain "client, proxy1, proxy2" — the client is
        # leftmost. Fall through to the next header if nothing here parses.
        for part in str(raw).split(','):
            ip = normalize_ip(part)
            if ip:
                return ip
    return normalize_ip(meta.get('REMOTE_ADDR'))


def _load_rules() -> dict:
    """``{normalized_ip: status}`` for every rule, cached briefly."""
    cached = cache.get(_CACHE_KEY)
    if cached is not None:
        return cached

    from core.backoffice_models import BlockedIp

    rules = {}
    now = timezone.now()
    for rule_id, ip_address, status, expires_at, is_permanent in (
        BlockedIp.objects.values_list(
            'id', 'ip_address', 'status', 'expires_at', 'is_permanent'
        )
    ):
        # A temporary block that has lapsed is no longer a block. It is left in
        # the table on purpose so the operator keeps the history.
        if status == 'block' and not is_permanent and expires_at and expires_at <= now:
            continue
        ip = normalize_ip(ip_address)
        if not ip:
            logger.warning('blocked_ips row %s has unparseable address %r', rule_id, ip_address)
            continue
        # "allow" is an explicit exemption and outranks a block on the same
        # address, whichever order the rows happen to come back in.
        if ip in rules and rules[ip] == 'allow':
            continue
        rules[ip] = status

    cache.set(_CACHE_KEY, rules, _CACHE_SECONDS)
    return rules


def invalidate_rules_cache() -> None:
    """Drop the cached rules so the next check re-reads the table.

    Called whenever the backoffice writes a rule, so an operator sees the effect
    immediately rather than waiting out the TTL.
    """
    cache.delete(_CACHE_KEY)


def is_blocked(ip: str | None) -> bool:
    """True when this address is blocked and not explicitly allowed."""
    ip = normalize_ip(ip)
    if not ip:
        # An unidentifiable address is not evidence of abuse; blocking here
        # would lock out anyone whose proxy misbehaves.
        return False
    try:
        return _load_rules().get(ip) == 'block'
    except Exception:
        # The block list is a control, not a dependency: if it cannot be read,
        # players keep playing and the failure goes to the log.
        logger.exception('blocked-IP lookup failed for %s', ip)
        return False


class IpBlocked(Exception):
    """Raised when a request comes from a blocked address."""


def enforce_ip(request) -> str | None:
    """Return the request's IP, raising :class:`IpBlocked` if it is blocked."""
    ip = get_client_ip(request)
    if is_blocked(ip):
        logger.info('rejected request from blocked IP %s', ip)
        raise IpBlocked('Access from this IP address has been blocked')
    return ip


def record_login(request, *, user_id=None, admin_id=None, session_id=None) -> None:
    """Write one ``login_history`` row — the trail the BO reports read.

    Never raises: a failure to record the trail must not stop someone signing
    in, so a broken write is logged and swallowed.
    """
    try:
        from core.backoffice_models import LoginHistory
        from core.geo import detect_geo_from_ip

        ip = get_client_ip(request)
        meta = getattr(request, 'META', None) or {}
        user_agent = (meta.get('HTTP_USER_AGENT') or '')[:1000]

        country_code = None
        if ip:
            try:
                country_code = (detect_geo_from_ip(ip) or {}).get('countryCode')
            except Exception:
                country_code = None

        LoginHistory.objects.create(
            user_id=user_id,
            admin_id=admin_id,
            ip_address=ip,
            user_agent=user_agent or None,
            device_type=_device_type(user_agent),
            country_code=country_code,
            session_id=session_id,
        )
    except Exception:
        logger.exception('failed to record login history')


def _device_type(user_agent: str) -> str:
    ua = (user_agent or '').lower()
    if 'ipad' in ua or 'tablet' in ua:
        return 'tablet'
    if 'mobi' in ua or 'android' in ua or 'iphone' in ua:
        return 'mobile'
    if not ua:
        return 'unknown'
    return 'desktop'
