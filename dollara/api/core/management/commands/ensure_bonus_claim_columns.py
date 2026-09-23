"""Add any bonuses claim-condition columns this build expects but the database lacks.

The feature schema is applied from SQL files, not Django migrations, and
deploy.sh only pulls, builds and restarts — it never runs SQL. The claim
conditions (minimum balance / wagering / deposits before an offer can be
claimed) added three columns to ``bonuses``; without them every ORM read of
the table fails with "Unknown column", taking the promotions list, the
player's Bonus page and the admin Bonuses screen down together.

This command heals that from Python, so it can run on every deploy without the
mysql CLI (the SQL file uses ``DELIMITER``, which only the CLI understands):

    python manage.py ensure_bonus_claim_columns --dry-run
    python manage.py ensure_bonus_claim_columns

Idempotent: it reads information_schema and adds only what is missing.
"""

from django.core.management.base import BaseCommand
from django.db import connection

TABLE = 'bonuses'

# (column, DDL, preferred anchor) — types match api/database/init.sql. The
# anchor keeps the column order readable; it is skipped when the anchor itself
# is missing so a partially-migrated table never blocks the repair.
EXPECTED_COLUMNS = (
    ('claim_min_balance', 'decimal(18,2) DEFAULT NULL', 'bonus_validity_days'),
    ('claim_min_wagering', 'decimal(18,2) DEFAULT NULL', 'claim_min_balance'),
    ('claim_min_deposit_total', 'decimal(18,2) DEFAULT NULL', 'claim_min_wagering'),
)


def existing_columns(cursor) -> set[str]:
    cursor.execute(
        '''SELECT column_name FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = %s''',
        [TABLE],
    )
    return {row[0] for row in cursor.fetchall()}


class Command(BaseCommand):
    help = 'Add missing claim-condition columns to bonuses (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List the columns that would be added without changing anything.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        with connection.cursor() as cursor:
            present = existing_columns(cursor)
            if not present:
                self.stderr.write(
                    f'Table `{TABLE}` does not exist in this database; load '
                    'api/database/init.sql first.'
                )
                return

            missing = [c for c in EXPECTED_COLUMNS if c[0] not in present]
            if not missing:
                self.stdout.write(self.style.SUCCESS(
                    f'`{TABLE}` already has every expected column; nothing to do.'
                ))
                return

            for name, ddl, anchor in missing:
                # Column names and DDL come from the constant table above, never
                # from user input, so string formatting is safe here.
                statement = f'ALTER TABLE `{TABLE}` ADD COLUMN `{name}` {ddl}'
                if anchor in present:
                    statement += f' AFTER `{anchor}`'
                # Track the column as present either way so the next anchor
                # resolves — and the dry run prints exactly what a real run does.
                present.add(name)
                if dry_run:
                    self.stdout.write(f'[dry-run] would add `{name}`: {statement}')
                    continue
                cursor.execute(statement)
                self.stdout.write(f'Added `{name}`')

        verb = 'would add' if dry_run else 'added'
        self.stdout.write(self.style.SUCCESS(
            f'{len(missing)} column(s) {verb} on `{TABLE}`: '
            + ', '.join(c[0] for c in missing)
        ))
