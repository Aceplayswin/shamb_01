"""Add affiliate qualification columns this build expects but the database lacks.

The feature schema is applied from ``database/init.sql``, not Django migrations,
and deploy.sh only pulls, builds and restarts — it never runs SQL. Commission
qualification (minimum deposit, minimum redeposits, qualification period) adds
columns to ``affiliates`` and ``affiliate_referrals``; without them every ORM
read of those tables fails with "Unknown column".

This command heals that from Python, so it can run on every deploy without the
mysql CLI:

    python manage.py ensure_affiliate_qualification_columns --dry-run
    python manage.py ensure_affiliate_qualification_columns

Idempotent: it reads information_schema and adds only what is missing.
Fresh installs already have these columns in ``database/init.sql``.
"""

from django.core.management.base import BaseCommand
from django.db import connection

# (column, DDL, preferred anchor) — types match api/database/init.sql.
EXPECTED = (
    ('affiliates', (
        ('min_deposit', "decimal(18,2) DEFAULT '0.00'", 'payout_threshold'),
        ('min_redeposits', "int DEFAULT '0'", 'min_deposit'),
        ('qualification_period_days', "int DEFAULT '0'", 'min_redeposits'),
    )),
    ('affiliate_referrals', (
        ('qualified_at', 'datetime DEFAULT NULL', 'cpa_paid'),
    )),
)


def existing_columns(cursor, table: str) -> set[str]:
    cursor.execute(
        '''SELECT column_name FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = %s''',
        [table],
    )
    return {row[0] for row in cursor.fetchall()}


class Command(BaseCommand):
    help = 'Add missing affiliate qualification columns (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List the columns that would be added without changing anything.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        added = []
        with connection.cursor() as cursor:
            for table, columns in EXPECTED:
                present = existing_columns(cursor, table)
                if not present:
                    self.stderr.write(
                        f'Table `{table}` does not exist in this database; load '
                        'api/database/init.sql first.'
                    )
                    continue

                for name, ddl, anchor in columns:
                    if name in present:
                        continue
                    statement = f'ALTER TABLE `{table}` ADD COLUMN `{name}` {ddl}'
                    if anchor in present:
                        statement += f' AFTER `{anchor}`'
                    present.add(name)
                    added.append(f'{table}.{name}')
                    if dry_run:
                        self.stdout.write(f'[dry-run] would add `{table}.{name}`: {statement}')
                        continue
                    cursor.execute(statement)
                    self.stdout.write(f'Added `{table}.{name}`')

        if not added:
            self.stdout.write(self.style.SUCCESS(
                'Affiliate qualification columns are already present; nothing to do.'
            ))
            return

        verb = 'would add' if dry_run else 'added'
        self.stdout.write(self.style.SUCCESS(
            f'{len(added)} column(s) {verb}: ' + ', '.join(added)
        ))
