from datetime import timedelta
from decimal import Decimal

import bcrypt
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import AdminUser, Bonus, Game, GameProvider, PlatformSetting


class Command(BaseCommand):
    help = 'Seed database with initial admin, providers, games, and settings'

    def handle(self, *args, **options):
        password_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
        admin, created = AdminUser.objects.get_or_create(
            username='superadmin',
            defaults={
                'email': 'admin@dollara.local',
                'password_hash': password_hash,
                'role': AdminUser.Role.SUPER_ADMIN,
                'two_factor_enabled': False,
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
            'site_name': 'DOLLARA',
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
