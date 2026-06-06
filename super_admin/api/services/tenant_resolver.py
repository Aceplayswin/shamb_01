"""Tenant Resolver Service.

Determines the active tenant (product) for a request from, in priority order:

1. An explicit ``X-Tenant`` / ``X-Tenant-ID`` header.
2. The request host matched against the ``urls.host_url`` column.
3. A ``tenant`` claim embedded in the JWT.
4. A development fallback (``DEFAULT_TENANT`` setting) for ``localhost``.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.core.cache import cache

from tenants.models import Database, Product
from tenants.state import register_tenant_connection, set_current_tenant, tenant_db_alias_for

_LOCAL_HOSTS = {'localhost', '127.0.0.1', '0.0.0.0', 'testserver'}


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
    product = _product_for_request(host, header_slug, jwt_slug)
    if not product:
        set_current_tenant(None, None)
        return None

    alias = tenant_db_alias_for(product.slug)
    db = Database.objects.filter(product_id=product.id).first()
    if db:
        register_tenant_connection(
            alias,
            name=db.db_name,
            host=db.db_host,
            port=db.db_port,
            user=db.db_user,
            password=db.db_password,
        )
    set_current_tenant(product.slug, alias)
    return ResolvedTenant(
        product_id=product.id,
        slug=product.slug,
        name=product.name,
        status=product.status,
        db_alias=alias,
    )


def activate_tenant_by_slug(slug: str) -> ResolvedTenant | None:
    return resolve_tenant(header_slug=slug)


def invalidate_tenant_cache(slug: str) -> None:
    cache.delete(f'tenant:resolve:{slug}')
