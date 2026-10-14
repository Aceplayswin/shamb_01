"""Tenant Resolver Service.

Determines the active tenant (product) for a request from its secret ``api_key``
(the ``X-Tenant-Key`` header), which is the product's verified identity. Products
are identified by key/id, not by a public slug.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.core.cache import cache

from tenants.models import Database, Product
from tenants.state import register_tenant_connection, set_current_tenant, tenant_db_alias_for


@dataclass
class ResolvedTenant:
    product_id: int
    name: str
    status: str
    db_alias: str


def _product_for_request(header_key: str | None) -> Product | None:
    # The product's api_key is the verified identity of the connection.
    if header_key:
        return Product.objects.filter(api_key=header_key).first()
    return None


def resolve_tenant(*, header_key: str | None = None) -> ResolvedTenant | None:
    product = _product_for_request(header_key)
    if not product:
        set_current_tenant(None, None)
        return None

    alias = tenant_db_alias_for(product.id)
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
    set_current_tenant(str(product.id), alias)
    return ResolvedTenant(
        product_id=product.id,
        name=product.name,
        status=product.status,
        db_alias=alias,
    )


def activate_tenant_by_key(api_key: str) -> ResolvedTenant | None:
    return resolve_tenant(header_key=api_key)


def invalidate_tenant_cache(product_id) -> None:
    cache.delete(f'tenant:resolve:{product_id}')
