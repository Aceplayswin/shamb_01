"""Runtime tenant context: thread-local current tenant + dynamic DB connection
registration.

This module is intentionally low-level and free of model imports so it can be
imported by the database router, middleware, services, and the feature code in
``core`` without creating import cycles.

Database-per-tenant strategy
----------------------------
- The ``default`` Django connection points at the master/control-plane DB.
- Each tenant (product) gets its own MySQL database, exposed to Django as a
  dynamically-registered connection alias ``tenant_<id>``.
- ``TenantRouter`` reads :func:`get_current_db` to route ORM access for the
  feature apps (``core``) to the resolved tenant connection, while the
  ``tenants`` control-plane app always stays on ``default``.
"""

import threading
from contextlib import contextmanager

from django.db import DEFAULT_DB_ALIAS, connections, transaction

_state = threading.local()


def tenant_db_alias_for(product_id) -> str:
    """Stable Django connection alias for a product (keyed by its id)."""
    return 'tenant_' + str(product_id).replace('-', '_')


def set_current_tenant(tenant_id: str | None, db_alias: str | None) -> None:
    _state.tenant_id = tenant_id
    _state.db_alias = db_alias


def clear_current_tenant() -> None:
    _state.tenant_id = None
    _state.db_alias = None


def get_current_tenant_id() -> str | None:
    return getattr(_state, 'tenant_id', None)


def get_current_db() -> str | None:
    """Resolved tenant connection alias for this thread, or ``None``.

    Returning ``None`` lets Django/the router fall back to ``default`` so that
    control-plane requests and management commands keep working.
    """
    return getattr(_state, 'db_alias', None)


def register_tenant_connection(
    alias: str,
    *,
    name: str,
    host: str,
    port: str | int,
    user: str,
    password: str,
) -> str:
    """Idempotently register (or refresh) a tenant DB connection alias.

    Builds the connection config from the ``default`` (master) connection so
    that engine/options stay consistent, overriding only the credentials and
    database name. Mutating ``connections.databases`` at runtime is supported by
    Django; missing keys are filled in lazily by ``connections[alias]``.
    """
    base = connections.databases.get(DEFAULT_DB_ALIAS, {})
    config = {
        'ENGINE': base.get('ENGINE', 'django.db.backends.mysql'),
        'NAME': name,
        'USER': user,
        'PASSWORD': password,
        'HOST': host,
        'PORT': str(port),
        'OPTIONS': dict(base.get('OPTIONS', {'charset': 'utf8mb4'})),
        'TIME_ZONE': base.get('TIME_ZONE'),
        'CONN_MAX_AGE': base.get('CONN_MAX_AGE', 0),
        'CONN_HEALTH_CHECKS': base.get('CONN_HEALTH_CHECKS', False),
        'AUTOCOMMIT': base.get('AUTOCOMMIT', True),
        'ATOMIC_REQUESTS': base.get('ATOMIC_REQUESTS', False),
    }
    existing = connections.databases.get(alias)
    if existing != config:
        # Drop any stale cached connection so the new config takes effect.
        if alias in connections.databases and alias in getattr(connections, '_connections', {}):
            try:
                connections[alias].close()
            except Exception:
                pass
        connections.databases[alias] = config
    return alias


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
