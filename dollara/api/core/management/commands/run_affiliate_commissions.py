"""Calculate affiliate commission for a period, then tidy up behind it.

Run nightly, some time after midnight so the previous day is complete:

    python manage.py run_affiliate_commissions                    # yesterday
    python manage.py run_affiliate_commissions --from 2026-08-01 --to 2026-08-07
    python manage.py run_affiliate_commissions --dry-run
    python manage.py run_affiliate_commissions --skip-approve
    python manage.py run_affiliate_commissions --housekeeping-only

Safe to re-run over the same dates. Entries carry a deterministic dedupe key
under a unique constraint, so a second pass corrects anything still pending and
refuses to touch commission that has already been approved or paid.

The admin console triggers the same code through
``POST /api/v1/admin/affiliates/commissions/run``, so a scheduled run and a
manual one cannot drift apart.
"""

from datetime import date

from django.core.management.base import BaseCommand, CommandError

from core import affiliate_commission


class Command(BaseCommand):
    help = 'Calculate affiliate commission for a period and run housekeeping.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--from', dest='date_from', type=str, default=None,
            help='First day to process, YYYY-MM-DD (default: yesterday).',
        )
        parser.add_argument(
            '--to', dest='date_to', type=str, default=None,
            help='Last day to process, YYYY-MM-DD (default: same as --from).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be written without touching the ledger.',
        )
        parser.add_argument(
            '--skip-approve', action='store_true',
            help='Do not promote aged pending entries to approved.',
        )
        parser.add_argument(
            '--housekeeping-only', action='store_true',
            help='Purge expired clicks and nonces without calculating anything.',
        )

    def _parse(self, value, label):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            raise CommandError(f'{label} must be YYYY-MM-DD, got {value!r}')

    def handle(self, *args, **options):
        if options['housekeeping_only']:
            purged = affiliate_commission.purge_old_rows()
            self.stdout.write(self.style.SUCCESS(
                f'Housekeeping: {purged["clicks_deleted"]} clicks and '
                f'{purged["nonces_deleted"]} nonces purged.'
            ))
            return

        start = self._parse(options['date_from'], '--from')
        end = self._parse(options['date_to'], '--to') or start
        dry_run = options['dry_run']

        result = affiliate_commission.run_commissions(
            period_start=start,
            period_end=end,
            trigger_source='cron',
            dry_run=dry_run,
            skip_approve=options['skip_approve'],
        )

        prefix = 'Would write' if dry_run else 'Wrote'
        self.stdout.write(self.style.SUCCESS(
            f'{prefix} {result["entries_written"]} entries '
            f'({result["entries_skipped"]} skipped as already approved/paid), '
            f'total {result["total_amount"]:.2f}, '
            f'{result["entries_approved"]} auto-approved, '
            f'for {result["period_start"]}..{result["period_end"]}.'
        ))

        if not dry_run:
            purged = affiliate_commission.purge_old_rows()
            self.stdout.write(
                f'Housekeeping: {purged["clicks_deleted"]} clicks and '
                f'{purged["nonces_deleted"]} nonces purged.'
            )
