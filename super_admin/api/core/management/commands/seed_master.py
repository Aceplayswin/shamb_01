"""Seed the master/control-plane database and provision the initial products.

Creates the platform Super Admin and onboards the three initial products
(Dollara, Product B, Product C), each with its own isolated tenant database,
white-label branding, and domains. Re-runnable (idempotent).

Prerequisite: the master schema must exist (apply database/master.sql first).
"""

import bcrypt
from django.core.management.base import BaseCommand

from services.tenant_provisioning import ProvisioningError, provision_product
from tenants.models import SuperAdminUser

INITIAL_PRODUCTS = [
    {
        'slug': 'dollara',
        'name': 'Dollara',
        'domains': ['dollara.com', 'dollara.localhost'],
        'branding': {
            'product_name': 'Dollara',
            'theme_color': '#ff9800',
            'secondary_color': '#a78bfa',
            'support_email': 'support@dollara.com',
            'support_phone': '+91-00000-00000',
        },
    },
    {
        'slug': 'productb',
        'name': 'Product B',
        'domains': ['productb.com', 'productb.localhost'],
        'branding': {
            'product_name': 'Product B',
            'theme_color': '#22c55e',
            'secondary_color': '#0ea5e9',
            'support_email': 'support@productb.com',
            'support_phone': '+91-11111-11111',
        },
    },
    {
        'slug': 'productc',
        'name': 'Product C',
        'domains': ['productc.com', 'productc.localhost'],
        'branding': {
            'product_name': 'Product C',
            'theme_color': '#ef4444',
            'secondary_color': '#f59e0b',
            'support_email': 'support@productc.com',
            'support_phone': '+91-22222-22222',
        },
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
        admin, created = SuperAdminUser.objects.get_or_create(
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
                    branding=dict(product['branding']),
                    domains=product['domains'],
                    seed=True,
                    stdout=lambda m: self.stdout.write(m),
                )
                self.stdout.write(self.style.SUCCESS(f"  done: {product['slug']}"))
            except ProvisioningError as e:
                self.stderr.write(self.style.ERROR(f"  failed: {product['slug']}: {e}"))

        self.stdout.write(self.style.SUCCESS('\nMaster seed completed.'))
        self.stdout.write('Super Admin login: superadmin / Admin@123')
        self.stdout.write('Per-tenant admin login: superadmin / Admin@123 (in each tenant DB)')
