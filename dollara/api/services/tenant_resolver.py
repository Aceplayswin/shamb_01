"""Tenant Resolver Service.

dollara serves a single product and identifies it purely by its api_key
(``PRODUCT_CONFIG_TOKEN``): the tenant is whatever product Super Admin returns for
that key over the control-plane config pull (see :mod:`services.control_plane`).
There is no slug/host/JWT guessing and no per-tenant DB switching — all feature
data lives on the Django ``default`` connection (``MYSQL_*``).

Resolution therefore succeeds iff dollara holds a valid key and the control plane
(or its last-known-good cache) can supply the product's identity.
"""

from __future__ import annotations

from dataclasses import dataclass

from services.control_plane import get_product_config, invalidate as invalidate_config
from tenants.state import set_current_tenant


@dataclass
class ResolvedTenant:
    product_id: int | None
    name: str
    status: str
    # Feature data lives on the ``default`` connection; kept for API compatibility
    # with callers that read ``db_alias`` (empty => the router uses ``default``).
    db_alias: str


def resolve_tenant() -> ResolvedTenant | None:
    """Resolve and activate this product for the current thread.

    Returns the resolved tenant (and sets the thread-local context) or ``None``
    when no key is configured / the control plane is unreachable and no
    last-known-good config is cached. Identity is the product id + name Super
    Admin returns for our api_key — there is no slug.
    """
    config = get_product_config()
    if not config:
        set_current_tenant(None, None)
        return None

    product = config.get('product') or {}
    product_id = product.get('id')
    set_current_tenant(str(product_id) if product_id is not None else None, None)
    return ResolvedTenant(
        product_id=product_id,
        name=product.get('name', ''),
        status=product.get('status', ''),
        db_alias='',
    )


def invalidate_tenant_cache() -> None:
    """Force the next resolution to re-fetch config from the control plane."""
    invalidate_config()
