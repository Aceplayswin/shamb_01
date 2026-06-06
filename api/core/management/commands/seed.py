from datetime import timedelta
from decimal import Decimal

import bcrypt
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Bonus, Game, GameProvider, PlatformSetting, User


class Command(BaseCommand):
    help = 'Seed a tenant database with initial admin, providers, games, and settings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            default=None,
            help='Product slug to seed. Activates that tenant DB connection before seeding.',
        )
        parser.add_argument(
            '--brand_name',
            default='DOLLARA',
            help='Brand name stored in the site_name platform setting.',
        )

    def handle(self, *args, **options):
        tenant = options.get('tenant')
        if tenant:
            # Activate the tenant DB so ORM writes are routed to it.
            from services.tenant_resolver import resolve_tenant

            resolve_tenant(header_slug=tenant)
            self.stdout.write(f'Seeding tenant: {tenant}')

        brand_name = options.get('brand_name') or 'DOLLARA'
        password_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
        admin, created = User.objects.get_or_create(
            username='superadmin',
            defaults={
                'email': 'admin@dollara.local',
                'password_hash': password_hash,
                'role': User.Role.SUPER_ADMIN,
                'account_status': User.AccountStatus.ACTIVE,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created superadmin'))

        providers = [
            ('Evolution Gaming', 'evolution'),
            ('Pragmatic Play', 'pragmatic'),
            ('NetEnt', 'netent'),
            ('Ezugi', 'ezugi'),
        ]
        games_data = [
            ('Lightning Roulette', 'live-casino', 'live_casino', True, False),
            ('Teen Patti Live', 'teen-patti-live', 'live_casino', True, False),
            ('Gates of Olympus', 'gates-of-olympus', 'slots', True, False),
            ('AI Aviator', 'ai-aviator', 'ai_games', True, True),
            ('AI Teen Patti', 'ai-teen-patti', 'ai_games', False, True),
            ('Mega Jackpot Lottery', 'mega-jackpot-lottery', 'lottery', True, False),
        ]

        for name, slug in providers:
            provider, _ = GameProvider.objects.get_or_create(
                slug=slug,
                defaults={'name': name},
            )
            for i, (gname, gslug, cat, featured, fair) in enumerate(games_data):
                Game.objects.get_or_create(
                    slug=f'{slug}-{gslug}' if slug != 'evolution' else gslug,
                    defaults={
                        'provider': provider,
                        'name': gname,
                        'category': cat,
                        'rtp': Decimal('96.5'),
                        'is_featured': featured,
                        'is_provably_fair': fair,
                        'sort_order': i,
                    },
                )

        Bonus.objects.get_or_create(
            name='welcome100',
            defaults={
                'display_title': 'Welcome Bonus ₹100',
                'bonus_type': 'no_deposit',
                'value_type': 'fixed',
                'value_amount': Decimal('100'),
                'min_deposit': Decimal('0'),
                'max_bonus_cap': Decimal('100'),
                'wagering_multiplier': Decimal('35'),
                'status': 'active',
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=365),
            },
        )

        settings_data = {
            'site_name': brand_name,
            'supported_languages': ['en', 'hi', 'ta', 'te', 'ml'],
            'min_deposit': 100,
            'min_withdrawal': 500,
            'auto_approve_withdrawal_limit': 10000,
        }
        for key, value in settings_data.items():
            PlatformSetting.objects.update_or_create(
                setting_key=key,
                defaults={'setting_value': value},
            )

        self.stdout.write(self.style.SUCCESS('Seed completed'))
        self.stdout.write('Admin login: superadmin / Admin@123')
