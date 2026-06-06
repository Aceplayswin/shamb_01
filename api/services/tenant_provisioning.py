"""Tenant provisioning service.

Implements the Super Admin "Create Product" / "Create Tenant Database"
capability: register a product in the master DB, create its isolated MySQL
database, apply the per-tenant schema, and seed initial data. Designed so new
products can be onboarded dynamically with no code changes.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import connections

from tenants.models import Branding, Domain, Product, Subscription, TenantDatabase
from tenants.state import register_tenant_connection, tenant_db_alias_for, use_tenant

INIT_SQL = Path(settings.BASE_DIR) / 'database' / 'init.sql'


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
    """Create the tenant's MySQL database if it does not already exist."""
    args = _mysql_base_args(host=host, port=port, user=user) + [
        '-e',
        f'CREATE DATABASE IF NOT EXISTS `{db_name}` '
        f'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
    ]
    _run_mysql(args, password)


def apply_schema(*, db_name: str, host: str, port: str, user: str, password: str) -> None:
    """Apply the per-tenant schema (init.sql) to the tenant database."""
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
    branding: dict | None = None,
    domains: list[str] | None = None,
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

    branding = branding or {}
    branding.setdefault('product_name', name)
    Branding.objects.update_or_create(product=product, defaults=branding)
    Subscription.objects.get_or_create(product=product)

    tenant_db, _ = TenantDatabase.objects.update_or_create(
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

    for index, host in enumerate(domains or []):
        Domain.objects.update_or_create(
            host=host.strip().lower(),
            defaults={'product': product, 'is_primary': index == 0},
        )

    # Physical database + schema.
    if stdout:
        stdout(f'  creating database {db_name} on {db_host}:{db_port} ...')
    create_database(db_name=db_name, host=db_host, port=db_port, user=db_user, password=db_password)
    if stdout:
        stdout('  applying tenant schema (init.sql) ...')
    apply_schema(db_name=db_name, host=db_host, port=db_port, user=db_user, password=db_password)

    # Register connection + seed inside the tenant context.
    alias = tenant_db_alias_for(slug)
    register_tenant_connection(
        alias, name=db_name, host=db_host, port=db_port, user=db_user, password=db_password
    )
    if seed:
        if stdout:
            stdout('  seeding tenant data ...')
        with use_tenant(slug, alias):
            call_command('seed', tenant=slug, brand_name=branding.get('product_name', name))

    tenant_db.is_provisioned = True
    tenant_db.save(update_fields=['is_provisioned', 'updated_at'])
    return product
