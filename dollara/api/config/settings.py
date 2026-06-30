import os
from pathlib import Path

from corsheaders.defaults import default_headers
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', os.getenv('JWT_SECRET', 'dev-secret-change-in-production'))
DEBUG = os.getenv('NODE_ENV', 'development') == 'development'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'strawberry.django',
    'channels',
    'tenants',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    # Resolve the tenant (and activate its DB) before auth/feature code runs.
    'middleware.tenant.TenantResolverMiddleware',
    'core.middleware.JWTAuthenticationMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# --- Multi-tenant database-per-tenant configuration ---
# `default` is the master / control-plane database (products, urls, branding,
# databases, product_themes — see super_admin/api/database/master.sql). Tenant
# databases are registered dynamically at runtime by the
# tenant resolver (see services/tenant_resolver.py + tenants/state.py) and routed
# via middleware.db_router.TenantRouter.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('MASTER_MYSQL_DATABASE', os.getenv('MYSQL_DATABASE', 'dollara_master')),
        'USER': os.getenv('MASTER_MYSQL_USER', os.getenv('MYSQL_USER', 'root')),
        'PASSWORD': os.getenv('MASTER_MYSQL_PASSWORD', os.getenv('MYSQL_PASSWORD', '')),
        'HOST': os.getenv('MASTER_MYSQL_HOST', os.getenv('MYSQL_HOST', 'localhost')),
        'PORT': os.getenv('MASTER_MYSQL_PORT', os.getenv('MYSQL_PORT', '3306')),
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}

DATABASE_ROUTERS = ['middleware.db_router.TenantRouter']

# Default tenant slug used for local development hosts (localhost/127.0.0.1)
# where no domain/subdomain is available.
DEFAULT_TENANT = os.getenv('DEFAULT_TENANT', 'dollara')

# In-process cache and channel layers (no Redis).
CACHES = {
    'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'},
}
CHANNEL_LAYERS = {
    'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
# Admin-uploaded images (game thumbnails, provider logos). Served locally —
# swap to S3/Cloudinary storage later by pointing DEFAULT_FILE_STORAGE at it,
# the upload view already goes through django.core.files.storage.default_storage.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Schema is applied via SQL (database/init.sql per tenant, database/master.sql
# for the control plane), so Django migrations are disabled for both apps.
MIGRATION_MODULES = {'core': None, 'tenants': None}

# TEMPORARY (development): allow every origin regardless of DEBUG so the
# frontend never hits a CORS preflight failure. django-cors-headers reflects
# the request Origin back (instead of "*") when credentials are enabled, so
# this stays compatible with CORS_ALLOW_CREDENTIALS.
# TODO: lock this down to an explicit allowlist before going to production.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = (
    *default_headers,
    'x-tenant',
    'x-tenant-id',
)

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'UNAUTHENTICATED_USER': None,
}

# DOLLARA platform settings
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-in-production')
JWT_REFRESH_SECRET = os.getenv('JWT_REFRESH_SECRET', 'dev-refresh-secret')
JWT_EXPIRY_DAYS = 7
WELCOME_BONUS = float(os.getenv('WELCOME_BONUS', '100'))
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 3
DEMO_SESSION_MINUTES = 30
API_PORT = int(os.getenv('PORT', '5000'))

# --- Game aggregator / provider integration ---
# All values come from the environment so credentials, keys, and URLs are never
# committed to source. See services/game_provider.py for how they are consumed.

def _normalize_launch_path(path: str) -> str:
    """Bare ``/`` or empty GAME_LAUNCH_PATH must not hit the aggregator root."""
    raw = (path or '/game/v1').strip()
    if raw in ('', '/'):
        return '/game/v1'
    return raw if raw.startswith('/') else f'/{raw}'


_api_public_url = os.getenv('API_URL', '').rstrip('/')
_callback_env = os.getenv('GAME_CALLBACK_BASE_URL', '').strip().rstrip('/')
# Prefer explicit GAME_CALLBACK_BASE_URL; else HTTPS API_URL (production); else localhost.
if _callback_env:
    _game_callback_base = _callback_env
elif _api_public_url.startswith('https://'):
    _game_callback_base = _api_public_url
else:
    _game_callback_base = 'http://localhost:5000'

GAME_PROVIDER = {
    'AGENCY_UID': os.getenv('GAME_AGENCY_UID', ''),
    'AES_SECRET_KEY': os.getenv('GAME_AES_SECRET_KEY', ''),
    'PLAYER_PREFIX': os.getenv('GAME_PLAYER_PREFIX', ''),
    'SERVER_URL': os.getenv('GAME_SERVER_URL', '').rstrip('/'),
    'CALLBACK_BASE_URL': _game_callback_base,
    # Path appended to CALLBACK_BASE_URL to build the callback_url sent to the
    # aggregator. Defaults to our Django games_callback route. For Winco-parity
    # testing against a shared agency account it can be set to '/game/' (the
    # legacy registered path) and reverse-proxied/aliased to games_callback.
    'CALLBACK_PATH': os.getenv('GAME_CALLBACK_PATH', '/api/v1/games/callback'),
    'HOME_URL': os.getenv('GAME_HOME_URL', 'http://localhost:3000'),
    'CURRENCY_CODE': os.getenv('GAME_CURRENCY_CODE', 'INR'),
    'DEFAULT_LANGUAGE': os.getenv('GAME_DEFAULT_LANGUAGE', 'en'),
    'HTTP_TIMEOUT': int(os.getenv('GAME_HTTP_TIMEOUT', '15')),
}
# Minimum main-wallet balance required to launch a game (currency units, string
# so the service layer can build a Decimal without float rounding).
GAME_MIN_LAUNCH_BALANCE = os.getenv('GAME_MIN_LAUNCH_BALANCE', '100')
# Set to 1 to skip the real aggregator and serve a local mock game frame.
GAME_MOCK_LAUNCH = os.getenv('GAME_MOCK_LAUNCH', '').lower() in ('1', 'true', 'yes')
# Launch endpoint path on the aggregator (default matches legacy /game/v1).
GAME_LAUNCH_PATH = _normalize_launch_path(os.getenv('GAME_LAUNCH_PATH', '/game/v1'))
