"""Settle sportsbook bet-slip results that were recorded as heartbeats.

A losing exchange bet slip settles with bet 0 / win 0 — its stakes were taken
when the bets were placed — and until the callback path read the provider's
own result (``exchange_payout`` / ``bet_slip_settle`` / selection statuses),
such a result was acked as a balance-sync ping and its stakes left Pending.
The provider never resends a callback it was acked for, so those results only
survive in ``game_callback_logs``.

This replays each one through the normal callback path, exactly as a
redelivery would be handled. No money moves (a heartbeat carries none), and it
is safe to run repeatedly: a slip that is already settled reads as a duplicate.

    python manage.py replay_sports_settlements --dry-run
    python manage.py replay_sports_settlements
    python manage.py replay_sports_settlements --since 2026-09-21
"""

from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from core import game_services


class Command(BaseCommand):
    help = 'Settle sportsbook bet-slip results that were acked as heartbeats.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--since',
            type=str,
            default=None,
            help='Only replay callbacks received on/after this date (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List the results that would be settled without changing anything.',
        )

    def handle(self, *args, **options):
        since = None
        if options['since']:
            try:
                since = timezone.make_aware(
                    datetime.strptime(options['since'], '%Y-%m-%d')
                )
            except ValueError:
                self.stderr.write(self.style.ERROR('--since must be YYYY-MM-DD'))
                return

        dry = options['dry_run']
        result = game_services.replay_sports_settlements(since=since, dry_run=dry)
        for item in result['found']:
            self.stdout.write(
                f"{'[dry-run] ' if dry else ''}{item['received_at']} "
                f"serial={item['serial_number']} member={item['member_account']} "
                f"bet_slip={item['bet_slip_id']} selections={item['selections']}"
            )

        if dry:
            self.stdout.write(
                f"[dry-run] {len(result['found'])} bet-slip result(s) recorded as heartbeats"
            )
            return
        self.stdout.write(self.style.SUCCESS(
            f"Replayed {len(result['found'])} bet-slip result(s): "
            f"{result['settled']} settled, {result['duplicate']} already settled, "
            f"{result['rejected']} rejected (see games_error.log)"
        ))
