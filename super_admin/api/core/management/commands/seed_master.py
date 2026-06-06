"""Seed the master/control-plane database and provision the initial products.

Creates the platform Super Admin and onboards the three initial products
(Dollara, Product B, Product C), each with its own isolated tenant database.
Re-runnable (idempotent).

Prerequisite: the master schema must exist (apply database/master.sql first).
"""

import bcrypt
from django.core.management.base import BaseCommand

from services.tenant_provisioning import ProvisioningError, provision_product
from tenants.models import User

INITIAL_PRODUCTS = [
    {
        'slug': 'dollara',
        'name': 'Dollara',
        'fe_url': 'https://dollara.com',
        'be_url': 'https://api.dollara.com',
    },
    {
        'slug': 'productb',
        'name': 'Product B',
        'fe_url': 'https://productb.com',
        'be_url': 'https://api.productb.com',
    },
    {
        'slug': 'productc',
        'name': 'Product C',
        'fe_url': 'https://productc.com',
        'be_url': 'https://api.productc.com',
    },
]


class Command(BaseCommand):
    help = 'Seed the master DB: super admin + initial products with isolated tenant DBs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-provision',
            action='store_true',
            help='Only create master records (super admin + products); skip creating tenant DBs.',
        )

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

        if options['skip_provision']:
            self.stdout.write(self.style.WARNING('Skipping tenant DB provisioning (--skip-provision).'))
            return

        for product in INITIAL_PRODUCTS:
            self.stdout.write(self.style.MIGRATE_HEADING(f"Provisioning '{product['slug']}' ..."))
            try:
                provision_product(
                    slug=product['slug'],
                    name=product['name'],
                    fe_url=product['fe_url'],
                    be_url=product['be_url'],
                    seed=True,
                    stdout=lambda m: self.stdout.write(m),
                )
                self.stdout.write(self.style.SUCCESS(f"  done: {product['slug']}"))
            except ProvisioningError as e:
                self.stderr.write(self.style.ERROR(f"  failed: {product['slug']}: {e}"))

        self.stdout.write(self.style.SUCCESS('\nMaster seed completed.'))
        self.stdout.write('Super Admin login: superadmin / Admin@123')
        self.stdout.write('Per-tenant admin login: superadmin / Admin@123 (in each tenant DB)')
