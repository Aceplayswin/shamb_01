"""Runtime tenant context: the thread-local current tenant.

This module is intentionally low-level and free of model imports so it can be
imported by the database router, middleware, services, and the feature code in
``core`` without creating import cycles.

This instance serves a single product and all feature data lives on the Django
``default`` connection (``MYSQL_*``). The thread-local still tracks the resolved
product slug (used for logging, JWT tenant claims, and branding lookups); the DB
alias is normally ``None`` so :class:`~middleware.db_router.TenantRouter` targets
``default``.
"""

import threading
from contextlib import contextmanager

from django.db import DEFAULT_DB_ALIAS, transaction

_state = threading.local()


def tenant_db_alias_for(slug: str) -> str:
    """Stable Django connection alias for a product slug."""
    return 'tenant_' + str(slug).replace('-', '_')


def set_current_tenant(product_slug: str | None, db_alias: str | None) -> None:
    _state.product_slug = product_slug
    _state.db_alias = db_alias


def clear_current_tenant() -> None:
    _state.product_slug = None
    _state.db_alias = None


def get_current_tenant_slug() -> str | None:
    return getattr(_state, 'product_slug', None)


def get_current_db() -> str | None:
    """Resolved tenant connection alias for this thread, or ``None``.

    Returning ``None`` lets Django/the router fall back to ``default`` so that
    control-plane requests and management commands keep working.
    """
    return getattr(_state, 'db_alias', None)


@contextmanager
def use_tenant(product_slug: str | None, db_alias: str | None):
    """Temporarily switch the active tenant (e.g. for admin cross-tenant ops)."""
    prev_slug = get_current_tenant_slug()
    prev_db = get_current_db()
    set_current_tenant(product_slug, db_alias)
    try:
        yield
    finally:
        set_current_tenant(prev_slug, prev_db)


def tenant_atomic():
    """``transaction.atomic`` bound to the current tenant DB.

    The feature services use this so deposits/withdrawals/bets stay atomic on
    the resolved tenant connection instead of defaulting to ``default``.
    """
    return transaction.atomic(using=get_current_db() or DEFAULT_DB_ALIAS)
