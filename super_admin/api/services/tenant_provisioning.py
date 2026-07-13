"""Tenant provisioning service.

Implements the Super Admin "Create Product" capability: register a product in
the master DB (branding, URLs, theme rows, webhook credential). The tenant
database itself is not created by this service — it must already exist and be
pointed at via the product's ``Database`` connection record.
"""

from __future__ import annotations

import re
import secrets

from services.branding import default_branding_for_product
from services.product_credentials import issue_credential
from tenants.models import Branding, Database, Product, Url


def new_api_key() -> str:
    """Secret issued per product, used to verify which product a connection
    belongs to. This is the product's identity — it replaces the slug."""
    return 'pk_' + secrets.token_hex(24)


def _db_name_from(name: str) -> str:
    """A safe default tenant-database name derived from the product name."""
    token = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_') or 'product'
    return f'{token}_db'


def provision_product(
    *,
    name: str,
    db_name: str | None = None,
    db_host: str | None = None,
    db_port: str | None = None,
    db_user: str | None = None,
    db_password: str | None = None,
    fe_url: str = '',
    be_url: str = '',
    branding: dict | None = None,
    stdout=None,
) -> Product:
    """Create a product end-to-end: master records + connection metadata.

    Products are identified by ``id`` (console) and ``api_key`` (product config
    pull); there is no slug. The api_key is NOT issued here — operators generate
    it explicitly from the console after creation. Idempotent by name: re-running
    for the same name updates records without destroying data. Does not create or
    modify the tenant database itself.
    """
    from django.db import connections

    default_db = connections.databases['default']
    db_name = db_name or _db_name_from(name)
    db_host = db_host or default_db.get('HOST', 'localhost')
    db_port = str(db_port or default_db.get('PORT', '3306'))
    db_user = db_user or default_db.get('USER', 'root')
    db_password = default_db.get('PASSWORD', '') if db_password is None else db_password

    product, created = Product.objects.get_or_create(
        name=name, defaults={'status': Product.Status.ACTIVE}
    )

    # Seed one theme row per catalog theme (theme1 active by default). Idempotent.
    from tenants.themes import ensure_product_themes
    ensure_product_themes(product)

    # Issue the product's RSA webhook credential (Super Admin signs data pulls,
    # the product verifies). Idempotent: keeps any existing active key pair.
    issue_credential(product)

    branding_data = default_branding_for_product(product)
    branding_data.update(branding or {})
    branding_data['product_name'] = (branding_data.get('product_name') or name).strip()
    Branding.objects.update_or_create(product=product, defaults=branding_data)

    Url.objects.update_or_create(
        product=product,
        defaults={'fe_url': fe_url, 'be_url': be_url},
    )

    Database.objects.update_or_create(
        product=product,
        defaults={
            'db_name': db_name,
            'db_host': db_host,
            'db_port': db_port,
            'db_user': db_user,
            'db_password': db_password,
        },
    )

    return product
