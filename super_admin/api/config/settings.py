import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', os.getenv('JWT_SECRET', 'dev-secret-change-in-production'))
DEBUG = os.getenv('NODE_ENV', 'development') == 'development'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,admin.ultraconic.com').split(',')

INSTALLED_APPS = [
    'django.contrib.staticfiles',
    'corsheaders',
    'tenants',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'tenants.auth_middleware.JWTAuthenticationMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# Master / control-plane database only. Tenant databases are registered at runtime
# when provisioning or inspecting products.
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

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

MIGRATION_MODULES = {'core': None, 'tenants': None}

# TEMPORARY (development): allow every origin regardless of DEBUG so the
# frontend never hits a CORS preflight failure. django-cors-headers reflects
# the request Origin back (instead of "*") when credentials are enabled, so
# this stays compatible with CORS_ALLOW_CREDENTIALS.
# TODO: lock this down to an explicit allowlist before going to production.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-in-production')
JWT_EXPIRY_DAYS = 7
API_PORT = int(os.getenv('PORT', '8000'))

# Shared secret a product API sends (X-Product-Token) to pull its own
# control-plane config from GET /api/v1/products/<slug>/config. Products read
# their branding/theme/webhook public keys over that endpoint instead of
# connecting to this master database directly. Empty => endpoint fails closed.
PRODUCT_CONFIG_TOKEN = os.getenv('PRODUCT_CONFIG_TOKEN', '')

# Path to the shared per-tenant schema applied when provisioning products.
TENANT_SCHEMA_PATH = os.getenv(
    'TENANT_SCHEMA_PATH',
    str(BASE_DIR / 'database' / 'init.sql'),
)
