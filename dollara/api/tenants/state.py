"""Runtime tenant context: the thread-local current tenant.

This module is intentionally low-level and free of model imports so it can be
imported by the database router, middleware, services, and the feature code in
``core`` without creating import cycles.

This instance serves a single product (identified by its api_key) and all feature
data lives on the Django ``default`` connection (``MYSQL_*``). The thread-local
tracks the resolved product **id** as a stable tenant key (used for logging, JWT
audit claims, and upload namespacing); the DB alias is normally ``None`` so
:class:`~middleware.db_router.TenantRouter` targets ``default``.
"""

import threading
from contextlib import contextmanager

from django.db import DEFAULT_DB_ALIAS, transaction

_state = threading.local()


def tenant_db_alias_for(tenant_id) -> str:
    """Stable Django connection alias for a product (keyed by its id)."""
    return 'tenant_' + str(tenant_id).replace('-', '_')


def set_current_tenant(tenant_id: str | None, db_alias: str | None) -> None:
    _state.tenant_id = tenant_id
    _state.db_alias = db_alias


def clear_current_tenant() -> None:
    _state.tenant_id = None
    _state.db_alias = None


def get_current_tenant_id() -> str | None:
    """The resolved product id for this thread (as a string), or ``None``."""
    return getattr(_state, 'tenant_id', None)


def get_current_db() -> str | None:
    """Resolved tenant connection alias for this thread, or ``None``.

    Returning ``None`` lets Django/the router fall back to ``default`` so that
    control-plane requests and management commands keep working.
    """
    return getattr(_state, 'db_alias', None)


@contextmanager
def use_tenant(tenant_id: str | None, db_alias: str | None):
    """Temporarily switch the active tenant (e.g. for admin cross-tenant ops)."""
    prev_id = get_current_tenant_id()
    prev_db = get_current_db()
    set_current_tenant(tenant_id, db_alias)
    try:
        yield
    finally:
        set_current_tenant(prev_id, prev_db)


def tenant_atomic():
    """``transaction.atomic`` bound to the current tenant DB.

    The feature services use this so deposits/withdrawals/bets stay atomic on
    the resolved tenant connection instead of defaulting to ``default``.
    """
    return transaction.atomic(using=get_current_db() or DEFAULT_DB_ALIAS)
