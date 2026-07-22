"""Complete player accounts that were left half-created by a failed sign-up.

Sign-up used to run outside a transaction, so when a later step failed (the
registration_path enum drift fixed by database/migrations/001) the users row and
its wallet stayed behind while the settings row never landed. Those players are
stuck: they can log in but have no preferences or referral code, and the unique
phone constraint stops them registering again.

Run once per tenant database after applying the migrations:

    python manage.py repair_incomplete_signups
    python manage.py repair_incomplete_signups --dry-run

register_user is atomic now, so this is a one-off repair, not a routine job.
"""

import random

from django.core.management.base import BaseCommand

from core import bonus_services
from core.models import User, UserSetting, Wallet
from tenants.state import tenant_atomic


class Command(BaseCommand):
    help = 'Backfill wallets/settings for players whose sign-up failed part-way.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be repaired without changing anything.',
        )

    def handle(self, *args, **options):
        missing_settings = User.objects.filter(
            role=User.Role.USER, usersetting__isnull=True
        ).order_by('id')
        missing_wallet = User.objects.filter(
            role=User.Role.USER, wallet__isnull=True
        ).order_by('id')

        if options['dry_run']:
            self.stdout.write(
                f'[dry-run] {missing_settings.count()} player(s) without settings, '
                f'{missing_wallet.count()} without a wallet'
            )
            return

        wallets = 0
        for user in list(missing_wallet):
            with tenant_atomic():
                Wallet.objects.create(user=user)
            wallets += 1

        settings_created = 0
        for user in list(missing_settings):
            with tenant_atomic():
                UserSetting.objects.create(
                    user=user,
                    registration_path=UserSetting.RegistrationPath.DIRECT,
                    phone_verified=bool(user.phone),
                    ai_voice_executive_id=f'AI_EXEC_{random.randint(1, 50):03d}',
                    referral_code=bonus_services._generate_referral_code(),
                )
            settings_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Repaired {settings_created} settings row(s) and {wallets} wallet(s)'
        ))
