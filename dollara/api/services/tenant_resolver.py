"""Tenant Resolver Service.

Determines the active tenant (product) for a request from, in priority order:

1. An explicit ``X-Tenant`` / ``X-Tenant-ID`` header (used by the mobile app and
   server-to-server calls).
2. The request host / subdomain (used by the web app: ``dollara.com`` ->
   ``dollara``, ``productb.localhost`` -> ``productb``).
3. A ``tenant`` claim embedded in the JWT.
4. A development fallback (``DEFAULT_TENANT`` setting) for ``localhost``.

The tenant's control-plane record (identity + status) is fetched from Super Admin
over HTTP (see :mod:`services.control_plane`) — dollara no longer reads the master
database. This instance serves a single product, so all feature data lives on the
Django ``default`` connection (``MYSQL_*``); there is no per-tenant DB switching.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from services.control_plane import get_product_config, invalidate as invalidate_config
from tenants.state import set_current_tenant

_LOCAL_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', 'testserver'}


@dataclass
class ResolvedTenant:
    product_id: int | None
    slug: str
    name: str
    status: str
    # Feature data lives on the ``default`` connection; kept for API compatibility
    # with callers that read ``db_alias`` (empty => the router uses ``default``).
    db_alias: str


def _strip_port(host: str) -> str:
    return (host or '').split(':')[0].strip().lower()


def _slug_from_host(host: str) -> str | None:
    """Best-effort slug extraction from a hostname subdomain label."""
    host = _strip_port(host)
    if not host or host in _LOCAL_HOSTS:
        return None
    labels = host.split('.')
    if len(labels) >= 2:
        candidate = labels[0]
        if candidate not in {'www', 'api', 'admin'}:
            return candidate
    return None


def _candidate_slugs(host: str, header_slug: str | None, jwt_slug: str | None) -> list[str]:
    """Ordered, de-duplicated tenant slugs to try, most specific first."""
    ordered: list[str] = []
    seen: set[str] = set()

    def add(slug: str | None) -> None:
        if slug and slug not in seen:
            seen.add(slug)
            ordered.append(slug)

    add(header_slug)
    clean_host = _strip_port(host)
    if clean_host and clean_host not in _LOCAL_HOSTS:
        add(_slug_from_host(clean_host))
    add(jwt_slug)
    add(getattr(settings, 'DEFAULT_TENANT', None))
    return ordered


def resolve_tenant(
    *,
    host: str = '',
    header_slug: str | None = None,
    jwt_slug: str | None = None,
) -> ResolvedTenant | None:
    """Resolve and activate the tenant for the current thread.

    Returns the resolved tenant (and sets the thread-local context) or ``None``
    when no tenant could be determined / the control plane is unreachable.
    """
    for slug in _candidate_slugs(host, header_slug, jwt_slug):
        config = get_product_config(slug)
        if not config:
            continue
        product = config.get('product') or {}
        resolved_slug = product.get('slug') or slug
        set_current_tenant(resolved_slug, None)
        return ResolvedTenant(
            product_id=product.get('id'),
            slug=resolved_slug,
            name=product.get('name', resolved_slug),
            status=product.get('status', ''),
            db_alias='',
        )

    set_current_tenant(None, None)
    return None


def activate_tenant_by_slug(slug: str) -> ResolvedTenant | None:
    """Activate a specific tenant by slug (used by admin cross-tenant ops/CLI)."""
    return resolve_tenant(header_slug=slug)


def invalidate_tenant_cache(slug: str) -> None:
    invalidate_config(slug)
