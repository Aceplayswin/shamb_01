"""Recognise "the database is behind this build" errors and explain the fix.

Feature schema is applied from SQL files rather than Django migrations, and
deploy.sh never runs SQL, so a column added in code can be missing in
production. Django then raises OperationalError/ProgrammingError with MySQL
error 1054 ("Unknown column ...") on every read of the table, which the
frontends surface as a bare "Internal Server Error". These helpers let the
views that read such tables return the command that repairs the schema.
"""

from django.http import JsonResponse

# MySQL 1054 = unknown column, 1146 = table doesn't exist.
_MISSING_SCHEMA_CODES = {1054, 1146}

PAYMENT_METHODS_SCHEMA_MESSAGE = (
    'The payment_methods table is missing columns. Run: '
    'python manage.py ensure_payment_method_columns '
    '(or apply api/database/migrations_payment_method_accounts.sql)'
)

BONUSES_SCHEMA_MESSAGE = (
    'The bonuses table is missing columns. Run: '
    'python manage.py ensure_bonus_claim_columns '
    '(or apply api/database/migration_bonus_claim_conditions.sql)'
)


def is_missing_column_error(exc: Exception) -> bool:
    """True for MySQL "unknown column" / "table doesn't exist" failures only,
    so a genuine outage (lost connection, deadlock) is still reported as such."""
    code = exc.args[0] if exc.args and isinstance(exc.args[0], int) else None
    if code in _MISSING_SCHEMA_CODES:
        return True
    text = str(exc)
    return 'Unknown column' in text or "doesn't exist" in text


def schema_error_response(
    status: int = 500, message: str = PAYMENT_METHODS_SCHEMA_MESSAGE
) -> JsonResponse:
    return JsonResponse({'error': message}, status=status)
