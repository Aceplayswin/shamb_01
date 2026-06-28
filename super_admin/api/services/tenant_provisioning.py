"""Tenant provisioning service.

Implements the Super Admin "Create Product" / "Create Tenant Database"
capability: register a product in the master DB, create its isolated MySQL
database, apply the per-tenant schema (includes seed data). Designed so new
products can be onboarded dynamically with no code changes.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.db import connections

from services.branding import default_branding_for_product
from services.product_credentials import issue_credential
from tenants.models import Branding, Database, Product, Url
from tenants.state import register_tenant_connection, tenant_db_alias_for

INIT_SQL = Path(getattr(settings, 'TENANT_SCHEMA_PATH', settings.BASE_DIR / 'database' / 'init.sql'))


class ProvisioningError(RuntimeError):
    pass


def _mysql_base_args(*, host: str, port: str, user: str) -> list[str]:
    return ['mysql', '-h', host, '-P', str(port), '-u', user, '--protocol=TCP']


def _run_mysql(args: list[str], password: str, stdin_path: Path | None = None) -> None:
    env = dict(os.environ)
    if password:
        env['MYSQL_PWD'] = password
    else:
        env.pop('MYSQL_PWD', None)
    stdin = open(stdin_path, 'rb') if stdin_path else None
    try:
        proc = subprocess.run(
            args, env=env, stdin=stdin, capture_output=True, text=True
        )
    finally:
        if stdin:
            stdin.close()
    if proc.returncode != 0:
        raise ProvisioningError(proc.stderr.strip() or 'mysql command failed')


def create_database(*, db_name: str, host: str, port: str, user: str, password: str) -> None:
    args = _mysql_base_args(host=host, port=port, user=user) + [
        '-e',
        f'CREATE DATABASE IF NOT EXISTS `{db_name}` '
        f'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    ]
    _run_mysql(args, password)


def apply_schema(*, db_name: str, host: str, port: str, user: str, password: str) -> None:
    if not INIT_SQL.exists():
        raise ProvisioningError(f'Schema file not found: {INIT_SQL}')
    args = _mysql_base_args(host=host, port=port, user=user) + [db_name]
    _run_mysql(args, password, stdin_path=INIT_SQL)


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
    seed: bool = True,
    stdout=None,
) -> Product:
    """Create a product end-to-end: master records + isolated DB + seed data.

    Idempotent: re-running for an existing slug updates records and re-applies
    the schema (CREATE TABLE IF NOT EXISTS) without destroying data.
    """
    default_db = connections.databases['default']
    db_name = db_name or f'{slug.replace("-", "_")}_db'
    db_host = db_host or default_db.get('HOST', 'localhost')
    db_port = str(db_port or default_db.get('PORT', '3306'))
    db_user = db_user or default_db.get('USER', 'root')
    db_password = default_db.get('PASSWORD', '') if db_password is None else db_password

    product, _ = Product.objects.update_or_create(
        slug=slug, defaults={'name': name, 'status': Product.Status.ACTIVE}
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

    tenant_db, _ = Database.objects.update_or_create(
        product=product,
        defaults={
            'db_name': db_name,
            'db_host': db_host,
            'db_port': db_port,
            'db_user': db_user,
            'db_password': db_password,
            'is_provisioned': False,
        },
    )

    if stdout:
        stdout(f'  creating database {db_name} on {db_host}:{db_port} ...')
    create_database(db_name=db_name, host=db_host, port=db_port, user=db_user, password=db_password)
    if stdout:
        stdout('  applying tenant schema (init.sql) ...')
    apply_schema(db_name=db_name, host=db_host, port=db_port, user=db_user, password=db_password)

    alias = tenant_db_alias_for(slug)
    register_tenant_connection(
        alias, name=db_name, host=db_host, port=db_port, user=db_user, password=db_password
    )

    tenant_db.is_provisioned = True
    tenant_db.save(update_fields=['is_provisioned', 'updated_at'])
    return product
