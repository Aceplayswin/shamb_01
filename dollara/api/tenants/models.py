"""Control-plane data no longer lives in a local (master) database.

dollara used to mirror Super Admin's master tables (``products``, ``branding``,
``urls``, ``databases``, ``product_credentials``, ``product_themes``) as read-only
ORM models on the ``default`` connection. It no longer connects to that database:
the same data is now fetched from Super Admin over HTTP and cached — see
:mod:`services.control_plane` and its consumers (``services/tenant_resolver.py``,
``services/branding.py``, ``services/super_admin_keys.py``).

The ``tenants`` app is kept for the runtime tenant context (``tenants.state``) and
the public branding view (``tenants.views``); it intentionally defines no models.
"""
