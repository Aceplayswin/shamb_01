"""Database router for database-per-tenant isolation.

- The control-plane app (``tenants``) always lives on the ``default`` (master)
  database.
- Every other app (the per-tenant feature code in ``core``) is routed to the
  tenant connection resolved for the current request/thread. When no tenant is
  active (management commands, control-plane requests) it falls back to
  ``default`` so nothing breaks.
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
        if app_label in CONTROL_PLANE_APPS:
            return db == DEFAULT_DB_ALIAS
        # Feature schema is applied via SQL (init.sql); never auto-migrate it
        # onto the master database.
        if db == DEFAULT_DB_ALIAS:
            return False
        return None
