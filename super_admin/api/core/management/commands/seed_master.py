"""Seed the master/control-plane database and create the initial products.

Creates the platform Super Admin and onboards the three initial products
(Dollara, Product B, Product C). Each product's tenant database must already
exist (created and schema-applied manually); this command only writes the
master-DB records (Product, Branding, Url, Database connection info, theme
rows, webhook credential). Re-runnable (idempotent).

Prerequisite: the master schema must exist (apply database/master.sql first).
"""

import bcrypt
from django.core.management.base import BaseCommand

from services.tenant_provisioning import provision_product
from tenants.models import User

INITIAL_PRODUCTS = [
    {
        'name': 'Dollara',
        'fe_url': 'https://dollara.com',
        'be_url': 'https://api.dollara.com',
    },
    {
        'name': 'Product B',
        'fe_url': 'https://productb.com',
        'be_url': 'https://api.productb.com',
    },
    {
        'name': 'Product C',
        'fe_url': 'https://productc.com',
        'be_url': 'https://api.productc.com',
    },
]


class Command(BaseCommand):
    help = 'Seed the master DB: super admin + initial products (tenant DBs must already exist)'

    def handle(self, *args, **options):
        password_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
        admin, created = User.objects.get_or_create(
            username='superadmin',
            defaults={'email': 'superadmin@platform.local', 'password_hash': password_hash},
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created super admin: superadmin'))
        else:
            self.stdout.write('Super admin already exists: superadmin')

        for product in INITIAL_PRODUCTS:
            self.stdout.write(self.style.MIGRATE_HEADING(f"Creating '{product['name']}' ..."))
            row = provision_product(
                name=product['name'],
                fe_url=product['fe_url'],
                be_url=product['be_url'],
            )
            self.stdout.write(self.style.SUCCESS(f"  done: {product['name']} (id={row.id})"))

        self.stdout.write(self.style.SUCCESS('\nMaster seed completed.'))
        self.stdout.write('Super Admin login: superadmin / Admin@123')
        self.stdout.write('Per-tenant admin login: superadmin / Admin@123 (in each tenant DB)')
