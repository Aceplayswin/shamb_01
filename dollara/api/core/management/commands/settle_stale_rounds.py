"""Force-settle game stakes the provider never reported a result for.

Sports and lottery stakes are recorded as PENDING until the vendor sends the
outcome. When a vendor simply stops talking about a losing bet, the round would
otherwise stay Pending forever. Run this on a schedule (hourly is plenty):

    python manage.py settle_stale_rounds
    python manage.py settle_stale_rounds --hours 24 --dry-run

No money moves — the stake was debited when the bet was placed.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from core import game_services
from core.models import GameRound


class Command(BaseCommand):
    help = 'Settle stakes left unresolved by the provider past a cutoff.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=None,
            help='Age in hours after which a pending stake is settled '
                 '(default: GAME_PENDING_STAKE_MAX_HOURS).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be settled without changing anything.',
        )

    def handle(self, *args, **options):
        hours = options['hours']

        if options['dry_run']:
            from django.conf import settings

            hours = hours or int(settings.GAME_PENDING_STAKE_MAX_HOURS)
            cutoff = timezone.now() - timedelta(hours=hours)
            count = GameRound.objects.filter(
                settle_status=GameRound.SettleStatus.PENDING,
                created_at__lt=cutoff,
            ).count()
            self.stdout.write(
                f'[dry-run] {count} stake(s) unresolved for over {hours}h'
            )
            return

        result = game_services.settle_stale_pending_rounds(hours)
        self.stdout.write(self.style.SUCCESS(
            f'Settled {result["settled"]} stale stake(s) across '
            f'{result["sessions_updated"]} session(s) '
            f'(older than {result["max_age_hours"]}h)'
        ))
