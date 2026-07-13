"""Tenant provisioning service.

Implements the Super Admin "Create Product" capability: register a product in
the master DB (branding, URLs, theme rows, webhook credential). The tenant
database itself is not created by this service — it must already exist and be
pointed at via the product's ``Database`` connection record.
"""

from __future__ import annotations

import secrets

from services.branding import default_branding_for_product
from services.product_credentials import issue_credential
from tenants.models import Branding, Database, Product, Url


def new_api_key() -> str:
    """Secret issued once per product, used to verify which product a
    connection belongs to (in place of the public, guessable slug)."""
    return 'pk_' + secrets.token_hex(24)


def provision_product(
    *,
    slug: str,
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

    Idempotent: re-running for an existing slug updates records without
    destroying data. Does not create or modify the tenant database itself.
    """
    from django.db import connections

    default_db = connections.databases['default']
    db_name = db_name or f'{slug.replace("-", "_")}_db'
    db_host = db_host or default_db.get('HOST', 'localhost')
    db_port = str(db_port or default_db.get('PORT', '3306'))
    db_user = db_user or default_db.get('USER', 'root')
    db_password = default_db.get('PASSWORD', '') if db_password is None else db_password

    product, created = Product.objects.update_or_create(
        slug=slug, defaults={'name': name, 'status': Product.Status.ACTIVE}
    )
    if created or not product.api_key:
        product.api_key = new_api_key()
        product.save(update_fields=['api_key', 'updated_at'])

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
