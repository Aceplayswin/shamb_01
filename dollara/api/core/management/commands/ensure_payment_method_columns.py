"""Add any payment_methods columns this build expects but the database lacks.

The feature schema is applied from SQL files, not Django migrations, and
deploy.sh only pulls, builds and restarts — it never runs SQL. When the
deposit-destination columns were added to ``payment_methods`` the accompanying
``migrations_payment_method_accounts.sql`` was documented but not applied, so
every ORM read of the table failed with "Unknown column" and the admin's
Cashier → Payment Methods screen showed a bare Internal Server Error.

This command heals that from Python, so it can run on every deploy without the
mysql CLI (the SQL file uses ``DELIMITER``, which only the CLI understands):

    python manage.py ensure_payment_method_columns --dry-run
    python manage.py ensure_payment_method_columns

Idempotent: it reads information_schema and adds only what is missing.
"""

from django.core.management.base import BaseCommand
from django.db import connection

TABLE = 'payment_methods'

# (column, DDL, preferred anchor) — types match api/database/init.sql. The
# anchor keeps the column order readable; it is skipped when the anchor itself
# is missing so a partially-migrated table never blocks the repair.
EXPECTED_COLUMNS = (
    ('account_name', 'varchar(120) DEFAULT NULL', 'countries'),
    ('account_number', 'varchar(64) DEFAULT NULL', 'account_name'),
    ('ifsc_code', 'varchar(20) DEFAULT NULL', 'account_number'),
    ('bank_name', 'varchar(120) DEFAULT NULL', 'ifsc_code'),
    ('branch_name', 'varchar(120) DEFAULT NULL', 'bank_name'),
    ('upi_id', 'varchar(120) DEFAULT NULL', 'branch_name'),
    ('qr_image_url', 'varchar(500) DEFAULT NULL', 'upi_id'),
    ('crypto_network', 'varchar(40) DEFAULT NULL', 'qr_image_url'),
    ('wallet_address', 'varchar(191) DEFAULT NULL', 'crypto_network'),
    ('instructions', 'text', 'wallet_address'),
)


def existing_columns(cursor) -> set[str]:
    cursor.execute(
        '''SELECT column_name FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = %s''',
        [TABLE],
    )
    return {row[0] for row in cursor.fetchall()}


class Command(BaseCommand):
    help = 'Add missing deposit-destination columns to payment_methods (idempotent).'

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
