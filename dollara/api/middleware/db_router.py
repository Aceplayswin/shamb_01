"""Database router.

This instance serves a single product and keeps all feature data on the
``default`` connection (``MYSQL_*``) — dollara no longer has a master/control-plane
database (that data is fetched from Super Admin over HTTP; see
``services/control_plane.py``). The router resolves ORM access to the current
tenant connection when one is set, otherwise ``default``; in practice
``get_current_db()`` returns ``None`` so everything lands on ``default``.

The ``tenants`` app defines no models now; it stays listed here only so any stray
control-plane lookup can never be routed off ``default``.
"""

from django.db import DEFAULT_DB_ALIAS

from tenants.state import get_current_db

CONTROL_PLANE_APPS = {'tenants'}


class TenantRouter:
    def _db_for(self, model):
        if model._meta.app_label in CONTROL_PLANE_APPS:
            return DEFAULT_DB_ALIAS
        return get_current_db() or DEFAULT_DB_ALIAS

    def db_for_read(self, model, **hints):
        return self._db_for(model)

    def db_for_write(self, model, **hints):
        return self._db_for(model)

    def allow_relation(self, obj1, obj2, **hints):
        # Relations are valid within the same database; control-plane and tenant
        # models never relate across the boundary.
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Feature schema is applied via SQL (init.sql), not Django migrations.
        return False
