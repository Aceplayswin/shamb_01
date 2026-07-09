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

# --- Database ---
# `default` is this product's OWN feature database (MYSQL_*). dollara no longer
# connects to Super Admin's master/control-plane database — that data (product
# identity, branding, theme, webhook public keys) is fetched over HTTP from Super
# Admin and cached; see services/control_plane.py. This instance serves a single
# product, so there is no per-tenant DB switching: all feature models live here.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('MYSQL_DATABASE', 'dollara'),
        'USER': os.getenv('MYSQL_USER', 'root'),
        'PASSWORD': os.getenv('MYSQL_PASSWORD', ''),
        'HOST': os.getenv('MYSQL_HOST', 'localhost'),
        'PORT': os.getenv('MYSQL_PORT', '3306'),
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}

DATABASE_ROUTERS = ['middleware.db_router.TenantRouter']

# --- Control plane (Super Admin) ---
# Where to fetch this product's control-plane config, and the shared secret that
# authenticates the pull (must match Super Admin's PRODUCT_CONFIG_TOKEN).
SUPER_ADMIN_URL = os.getenv('SUPER_ADMIN_URL', 'http://localhost:8000').rstrip('/')
PRODUCT_CONFIG_TOKEN = os.getenv('PRODUCT_CONFIG_TOKEN', '')
# How long (seconds) to cache a fetched config before re-checking Super Admin.
CONTROL_PLANE_CACHE_TTL = int(os.getenv('CONTROL_PLANE_CACHE_TTL', '60'))
CONTROL_PLANE_HTTP_TIMEOUT = int(os.getenv('CONTROL_PLANE_HTTP_TIMEOUT', '10'))

# Default tenant slug used for local development hosts (localhost/127.0.0.1)
# where no domain/subdomain is available. This instance's single product.
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

# --------------------------------------------------------------------------- #
# Logging — game-play lifecycle to rotating files under logs/.
#
# The 'games' logger (see core/game_logging.py) writes a greppable, plain-text
# record of every launch, settlement (bet/win/loss/balance) and failure to
# logs/games.log; everything WARNING+ (interruptions, rejected callbacks,
# decrypt/internal errors) is mirrored to logs/games_error.log so problems are
# easy to find and diagnose. Files rotate so they never grow unbounded.
# --------------------------------------------------------------------------- #
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'game': {'format': '%(asctime)s %(levelname)s %(message)s'},
    },
    'handlers': {
        'games_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'games.log'),
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 10,
            'formatter': 'game',
            'level': 'INFO',
            'encoding': 'utf-8',
        },
        'games_error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': str(LOG_DIR / 'games_error.log'),
            'maxBytes': 5 * 1024 * 1024,
            'backupCount': 10,
            'formatter': 'game',
            'level': 'WARNING',
            'encoding': 'utf-8',
        },
    },
    'loggers': {
        'games': {
            'handlers': ['games_file', 'games_error_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

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
