"""Tenant Resolver Service.

Determines the active tenant (product) for a request from, in priority order:

1. An explicit ``X-Tenant`` / ``X-Tenant-ID`` header (used by the mobile app and
   server-to-server calls).
2. The request host / subdomain (used by the web app: ``dollara.com`` ->
   ``dollara``, ``productb.localhost`` -> ``productb``).
3. A ``tenant`` claim embedded in the JWT.
4. A development fallback (``DEFAULT_TENANT`` setting) for ``localhost``.

Once resolved, the tenant's isolated database connection is registered and the
thread-local tenant context is set so the ORM (via ``TenantRouter``) transparently
targets the right database. No hardcoded product logic lives here.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.core.cache import cache
from django.db.utils import OperationalError, ProgrammingError

from tenants.models import Database, Product
from tenants.state import register_tenant_connection, set_current_tenant, tenant_db_alias_for

_LOCAL_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', 'testserver'}

# Optional control-plane tables (``databases``, ``branding``, ...) may not be
# provisioned in every deployment — only ``products`` is required for tenant
# resolution. Treat a missing optional table as "no row" instead of a hard 500.
_MISSING_TABLE_ERRORS = (ProgrammingError, OperationalError)


def _first_or_none(queryset):
    """``.first()`` that tolerates an optional control-plane table being absent."""
    try:
        return queryset.first()
    except _MISSING_TABLE_ERRORS:
        return None


@dataclass
class ResolvedTenant:
    product_id: int
    slug: str
    name: str
    status: str
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


def _product_for_request(host: str, header_slug: str | None, jwt_slug: str | None) -> Product | None:
    # 1. Explicit header slug.
    if header_slug:
        product = Product.objects.filter(slug=header_slug).first()
        if product:
            return product

    # 2. Subdomain heuristic from request host.
    clean_host = _strip_port(host)
    if clean_host and clean_host not in _LOCAL_HOSTS:
        sub_slug = _slug_from_host(clean_host)
        if sub_slug:
            product = Product.objects.filter(slug=sub_slug).first()
            if product:
                return product

    # 3. JWT tenant claim.
    if jwt_slug:
        product = Product.objects.filter(slug=jwt_slug).first()
        if product:
            return product

    # 4. Development fallback.
    default_slug = getattr(settings, 'DEFAULT_TENANT', None)
    if default_slug:
        return Product.objects.filter(slug=default_slug).first()
    return None


def resolve_tenant(
    *,
    host: str = '',
    header_slug: str | None = None,
    jwt_slug: str | None = None,
) -> ResolvedTenant | None:
    """Resolve and activate the tenant for the current thread.

    Returns the resolved tenant (and sets the thread-local context + registers
    the DB connection) or ``None`` when no tenant could be determined.
    """
    product = _product_for_request(host, header_slug, jwt_slug)
    if not product:
        set_current_tenant(None, None)
        return None

    alias = tenant_db_alias_for(product.slug)
    db = _first_or_none(Database.objects.filter(product_id=product.id))
    if db:
        register_tenant_connection(
            alias,
            name=db.db_name,
            host=db.db_host,
            port=db.db_port,
            user=db.db_user,
            password=db.db_password,
        )
        active_alias = alias
    else:
        # No isolated tenant database is provisioned for this product (e.g. a
        # single-tenant deployment that keeps everything in the master DB).
        active_alias = None
    set_current_tenant(product.slug, active_alias)
    return ResolvedTenant(
        product_id=product.id,
        slug=product.slug,
        name=product.name,
        status=product.status,
        db_alias=active_alias or '',
    )


def activate_tenant_by_slug(slug: str) -> ResolvedTenant | None:
    """Activate a specific tenant by slug (used by admin cross-tenant ops/CLI)."""
    return resolve_tenant(header_slug=slug)


def invalidate_tenant_cache(slug: str) -> None:
    cache.delete(f'tenant:resolve:{slug}')
