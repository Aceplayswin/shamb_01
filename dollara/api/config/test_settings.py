"""Test settings: self-contained SQLite DB, ORM-built tables, no MySQL/tenant deps.

The production stack applies schema via SQL and disables Django migrations, and
routes ``core`` models to a per-tenant MySQL connection. For unit/integration
tests we instead:

- use an in-memory SQLite database,
- re-enable migration discovery so the test runner builds tables from the models
  (Django auto-creates an in-memory schema from the model definitions), and
- drop the tenant DB router so every model lives on ``default``.

Run with:
    python manage.py test core --settings=config.test_settings
"""

from config.settings import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# No tenant routing in tests — keep all models on the default connection.
DATABASE_ROUTERS = []

# Re-enable migrations so the test runner can build tables from the models.
# (Production disables these because schema is applied via SQL.)
MIGRATION_MODULES = {}

# Keep middleware minimal and deterministic for view tests.
MIDDLEWARE = [
    'core.middleware.JWTAuthenticationMiddleware',
]

# Deterministic provider config for crypto/launch tests (matches games.md key).
GAME_PROVIDER = {
    'AGENCY_UID': 'test_agency_uid',
    'AES_SECRET_KEY': '1f806d609f1ef42a131a187d1509ca98',
    'PLAYER_PREFIX': 'h72add',
    'SERVER_URL': 'https://aggregator.test',
    'CALLBACK_BASE_URL': 'https://api.test',
    'HOME_URL': 'https://app.test',
    'CURRENCY_CODE': 'INR',
    'DEFAULT_LANGUAGE': 'en',
    'HTTP_TIMEOUT': 5,
}
GAME_MIN_LAUNCH_BALANCE = '100'
