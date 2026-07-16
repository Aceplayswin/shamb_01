"""Super Admin control-plane API.

All super-admin endpoints operate on the master database and are guarded by the
``super_admin`` role. Endpoints that inspect a specific tenant switch into that
tenant's database context explicitly.
"""

import hmac
import json
import ssl
import urllib.error
import urllib.request
from datetime import timedelta

import bcrypt
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from tenants.auth_jwt import sign_token
from tenants.auth_middleware import require_auth
from services.branding import (
    IDENTITY_FIELDS, ensure_branding, get_all_theme_branding,
    get_branding_for_product,
)
from tenants.theme_palettes import color_tokens, resolve_colors
from services.product_credentials import (
    get_active_credential, issue_credential, mark_delivered, rotate_credential,
    serialize_credential,
)
from services.tenant_provisioning import new_api_key, provision_product
from services.tenant_resolver import invalidate_tenant_cache
from services.webhook_client import WebhookError, call_product
from tenants.models import (
    Database, Product, ProductCredential, ProductTheme, Url, User,
    UserSession, WebhookDelivery,
)
from tenants.state import tenant_db_alias_for, use_tenant
from tenants.themes import (
    DEFAULT_THEME, THEME_CATALOG, THEME_KEYS,
    ensure_product_themes, get_active_theme, set_active_theme,
)

# Catalog metadata (name/description) keyed by theme_key, for enriching rows.
_CATALOG_BY_KEY = {t['key']: t for t in THEME_CATALOG}


def _json_body(request) -> dict:
    if not request.body:
        return {}
    return json.loads(request.body)


def _error(message, status=400):
    return JsonResponse({'error': str(message)}, status=status)


def _serialize_theme_row(row: ProductTheme) -> dict:
    meta = _CATALOG_BY_KEY.get(row.theme_key, {})
    return {
        'theme_key': row.theme_key,
        'name': meta.get('name', row.theme_key),
        'description': meta.get('description', ''),
        'is_active': row.is_active,
        'is_enabled': row.is_enabled,
    }


def _product_theme_rows(product: Product) -> list[dict]:
    """All theme rows for a product (ensuring they exist), in catalog order."""
    ensure_product_themes(product)
    rows = {t.theme_key: t for t in product.themes.all()}
    ordered = [rows[k] for k in THEME_KEYS if k in rows]
    return [_serialize_theme_row(r) for r in ordered]


def _serialize_product(product: Product) -> dict:
    db = Database.objects.filter(product=product).first()
    url_obj = Url.objects.filter(product=product).first()
    theme_rows = _product_theme_rows(product)
    active = next((r['theme_key'] for r in theme_rows if r['is_active']), DEFAULT_THEME)
    branding_by_theme = get_all_theme_branding(product)
    cred = get_active_credential(product)
    return {
        'id': product.id,
        'name': product.name,
        'api_key': product.api_key,
        'status': product.status,
        'created_at': product.created_at.isoformat(),
        'themes': theme_rows,
        'active_theme': active,
        # Active theme's branding (back-compat) + every theme's branding.
        'branding': branding_by_theme.get(active),
        'branding_by_theme': branding_by_theme,
        'urls': {
            'fe_url': url_obj.fe_url if url_obj else '',
            'be_url': url_obj.be_url if url_obj else '',
        },
        'database': {
            'db_name': db.db_name if db else None,
            'db_host': db.db_host if db else None,
        },
        'credential': {
            'key_id': cred.key_id if cred else None,
            'fingerprint': cred.fingerprint if cred else None,
            'delivered': bool(cred and cred.delivered_to_product_at) if cred else False,
        },
    }


def _get_client_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


# --- Super Admin auth ---
@csrf_exempt
@require_http_methods(['POST'])
def super_admin_login(request):
    try:
        body = _json_body(request)
        username = body['username']
        password = body['password']
    except (KeyError, json.JSONDecodeError) as e:
        return _error(e)

    admin = User.objects.filter(username=username, is_active=True).first()
    if not admin or not bcrypt.checkpw(password.encode(), admin.password_hash.encode()):
        return _error('Invalid credentials', 401)

    # Enforce single active session: invalidate all previous sessions for this user.
    UserSession.objects.filter(user=admin, is_active=True).update(is_active=False)

    admin.last_login_at = timezone.now()
    admin.save(update_fields=['last_login_at'])

    token = sign_token({'sub': admin.id, 'role': 'super_admin'})

    # Record the new session.
    UserSession.objects.create(
        user=admin,
        session_token=token,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        device_type=_detect_device_type(request.META.get('HTTP_USER_AGENT', '')),
        is_active=True,
        expires_at=timezone.now() + timedelta(days=7),
    )

    return JsonResponse({
        'token': token,
        'role': 'super_admin',
        'username': admin.username,
    })


def _detect_device_type(user_agent: str) -> str:
    ua = user_agent.lower()
    if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
        return 'mobile'
    if 'tablet' in ua or 'ipad' in ua:
        return 'tablet'
    return 'desktop'


# --- Products ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def products_list(request):
    products = Product.objects.order_by('-created_at')
    return JsonResponse([_serialize_product(p) for p in products], safe=False)


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def products_create(request):
    try:
        body = _json_body(request)
        name = body['name'].strip()
    except (KeyError, json.JSONDecodeError) as e:
        return _error(e)
    if not name:
        return _error('name is required')
    db = body.get('database') or {}
    urls = body.get('urls') or {}
    product = provision_product(
        name=name,
        db_name=db.get('db_name'),
        db_host=db.get('db_host'),
        db_port=db.get('db_port'),
        db_user=db.get('db_user'),
        db_password=db.get('db_password'),
        fe_url=urls.get('fe_url', ''),
        be_url=urls.get('be_url', ''),
        branding=body.get('branding'),
    )
    invalidate_tenant_cache(product.id)
    return JsonResponse(_serialize_product(product), status=201)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_detail(request, product_id):
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_update(request, product_id):
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    body = _json_body(request)
    if 'name' in body:
        product.name = body['name']
    if 'status' in body and body['status'] in dict(Product.Status.choices):
        product.status = body['status']
    product.save(update_fields=['name', 'status', 'updated_at'])
    invalidate_tenant_cache(product.id)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_disable(request, product_id):
    updated = Product.objects.filter(id=product_id).update(status=Product.Status.DISABLED)
    if not updated:
        return _error('Product not found', 404)
    invalidate_tenant_cache(product_id)
    return JsonResponse({'id': product_id, 'status': Product.Status.DISABLED})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['DELETE'])
def product_delete(request, product_id):
    """Delete the product's control-plane records. The isolated tenant database
    is intentionally NOT dropped here (irreversible); operators remove it
    manually after export."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    product.delete()
    invalidate_tenant_cache(product_id)
    return JsonResponse({'deleted': True, 'id': product_id})


# --- API key ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_api_key_generate(request, product_id):
    """Generate (or regenerate) the product's api_key — its PRODUCT_CONFIG_TOKEN.

    This is the secret the product's own API holds to pull its config and identify
    itself to Super Admin. Regenerating invalidates the previous key: the product
    must be updated with the new value before it can talk to Super Admin again.
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    product.api_key = new_api_key()
    product.save(update_fields=['api_key', 'updated_at'])
    invalidate_tenant_cache(product.id)
    return JsonResponse({'id': product.id, 'api_key': product.api_key})


# --- Database ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_database_update(request, product_id):
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    db = Database.objects.filter(product=product).first()
    if not db:
        return _error('Database record not found', 404)
    body = _json_body(request)
    changed = []
    for field in ('db_name', 'db_host', 'db_port', 'db_user'):
        if field in body and body[field]:
            setattr(db, field, body[field].strip())
            changed.append(field)
    if body.get('db_password'):
        db.db_password = body['db_password']
        changed.append('db_password')
    if changed:
        db.save(update_fields=changed + ['updated_at'])
    return JsonResponse({
        'db_name': db.db_name,
        'db_host': db.db_host,
        'db_port': db.db_port,
        'db_user': db.db_user,
    })


# --- URLs ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'PUT'])
def product_urls(request, product_id):
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    if request.method == 'GET':
        url_obj = Url.objects.filter(product=product).first()
        return JsonResponse({
            'fe_url': url_obj.fe_url if url_obj else '',
            'be_url': url_obj.be_url if url_obj else '',
        })
    body = _json_body(request)
    defaults = {}
    for field in ('fe_url', 'be_url'):
        if field in body:
            defaults[field] = body[field].strip()
    Url.objects.update_or_create(product=product, defaults=defaults)
    invalidate_tenant_cache(product.id)
    url_obj = Url.objects.get(product=product)
    return JsonResponse({
        'fe_url': url_obj.fe_url,
        'be_url': url_obj.be_url,
    })


# --- Branding ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'PUT'])
def product_branding(request, product_id):
    """Get/set white-label branding for one theme of a product.

    Theme is chosen via ``?theme=<key>`` (GET) or ``theme_key`` in the body (PUT),
    defaulting to the product's live theme. Colors are sent as a ``colors`` map of
    ``{token_key: hex}``; any token omitted keeps that theme's default.
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)

    if request.method == 'GET':
        theme_key = (request.GET.get('theme') or get_active_theme(product)).strip()
        if theme_key not in THEME_KEYS:
            return _error(f'Unknown theme: {theme_key}', 404)
        payload = get_branding_for_product(product, theme_key)
        return JsonResponse(payload)

    body = _json_body(request)
    theme_key = (body.get('theme_key') or get_active_theme(product)).strip()
    if theme_key not in THEME_KEYS:
        return _error(f'Unknown theme: {theme_key}', 404)

    row = ensure_branding(product, theme_key, product_name=product.name)

    # Identity fields.
    for field in IDENTITY_FIELDS:
        if field not in body:
            continue
        value = body[field]
        if field == 'extra' and value is not None and not isinstance(value, (dict, list)):
            return _error('extra must be a JSON object or array')
        setattr(row, field, value)

    if not str(row.product_name or '').strip():
        return _error('product_name cannot be empty')

    # Colors: merge submitted overrides over the theme's defaults. Accept either a
    # `colors` map or the legacy flat theme_color/secondary_color fields.
    valid_keys = {t['key'] for t in color_tokens(theme_key)}
    incoming = {}
    if isinstance(body.get('colors'), dict):
        incoming.update({k: v for k, v in body['colors'].items() if k in valid_keys})
    if 'theme_color' in body and 'primary' in valid_keys:
        incoming['primary'] = body['theme_color']
    if 'secondary_color' in body and 'accent' in valid_keys:
        incoming['accent'] = body['secondary_color']
    resolved = resolve_colors(theme_key, incoming)
    row.colors = resolved
    row.theme_color = resolved.get('primary', row.theme_color)
    row.secondary_color = resolved.get('accent', row.secondary_color)
    row.save()

    invalidate_tenant_cache(product.id)
    return JsonResponse(get_branding_for_product(product, theme_key))


# --- Themes ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def themes_catalog(request):
    """The full catalog of themes a product may render. Drives the super-admin UI.

    Each theme carries its ``colors`` token schema (key/label/group/default) so the
    branding editor can render a color picker per token with the right defaults.
    """
    themes = [
        {**t, 'colors': color_tokens(t['key'])}
        for t in THEME_CATALOG
    ]
    return JsonResponse({'themes': themes, 'default': DEFAULT_THEME}, safe=False)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_themes(request, product_id):
    """List a product's theme rows (one per catalog theme), with active/enabled
    flags. Rows are auto-seeded if missing."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    rows = _product_theme_rows(product)
    active = next((r['theme_key'] for r in rows if r['is_active']), DEFAULT_THEME)
    return JsonResponse({'id': product.id, 'themes': rows, 'active_theme': active})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_theme_activate(request, product_id):
    """Activate exactly one theme for a product (deactivates all others).

    Body: {"theme_key": "theme2"}
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    body = _json_body(request)
    theme_key = (body.get('theme_key') or '').strip()
    if not theme_key:
        return _error('theme_key is required')
    try:
        active = set_active_theme(product, theme_key)
    except ValueError as e:
        return _error(e)
    invalidate_tenant_cache(product.id)
    return JsonResponse({'id': product.id, 'active_theme': active, 'themes': _product_theme_rows(product)})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_theme_set_enabled(request, product_id, theme_key):
    """Enable/disable a theme row for a product. A disabled theme cannot be the
    live theme; disabling the active theme moves Live to another enabled theme.

    Body: {"is_enabled": false}
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    if theme_key not in THEME_KEYS:
        return _error(f'Unknown theme: {theme_key}', 404)
    ensure_product_themes(product)
    row = product.themes.filter(theme_key=theme_key).first()
    if not row:
        return _error('Theme not found for product', 404)

    body = _json_body(request)
    is_enabled = bool(body.get('is_enabled', True))

    if not is_enabled:
        # Don't allow disabling the last enabled theme.
        enabled_count = product.themes.filter(is_enabled=True).count()
        if row.is_enabled and enabled_count <= 1:
            return _error('At least one theme must remain enabled')

    row.is_enabled = is_enabled
    if not is_enabled:
        row.is_active = False
    row.save(update_fields=['is_enabled', 'is_active', 'updated_at'])

    # If we just disabled the live theme, promote another enabled one.
    if not product.themes.filter(is_active=True).exists():
        fallback = (
            product.themes.filter(is_enabled=True)
            .order_by('theme_key')
            .first()
        )
        if fallback:
            set_active_theme(product, fallback.theme_key)

    invalidate_tenant_cache(product.id)
    return JsonResponse({'id': product.id, 'themes': _product_theme_rows(product)})


# --- Public (unauthenticated) branding + theme for product frontends ---
@require_http_methods(['GET'])
def public_product_branding(request, product_id):
    """Public endpoint product frontends call for white-label branding.

    Returns the branding for ``?theme=<key>`` (defaults to the live theme).
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    theme_key = (request.GET.get('theme') or get_active_theme(product)).strip()
    if theme_key not in THEME_KEYS:
        theme_key = get_active_theme(product)
    payload = get_branding_for_product(product, theme_key)
    payload['status'] = product.status
    return JsonResponse(payload)


@require_http_methods(['GET'])
def public_product_theme(request, product_id):
    """Public endpoint a product frontend calls to learn its live theme.

    Returns only the active theme key (and the known keys so the frontend can
    guard against rendering a theme it doesn't ship). No auth: this is read-only,
    non-sensitive presentation config. Disabled products report no theme so the
    frontend can show a maintenance state."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    if not product.is_active:
        return JsonResponse({'id': product.id, 'active_theme': None, 'status': product.status})
    active = get_active_theme(product)
    return JsonResponse({
        'id': product.id,
        'active_theme': active,
        'status': product.status,
        'known_themes': THEME_KEYS,
    })


# --- Product config delivery (token-authenticated, server-to-server) ---
# A product's own API pulls everything it used to read from this master database
# (identity, branding, live theme, webhook public keys) from here, so products no
# longer open a MySQL connection to the control plane. The product is identified
# by its api_key (X-Product-Token); see product_config_self / _product_for_api_key.

def _product_config_payload(product: Product) -> dict:
    """Build the control-plane config body Super Admin delivers to a product.

    Returns the product identity + status, white-label branding, the live theme,
    and the product's webhook credentials — **public keys only** (``private_pem``
    never leaves Super Admin). All active/rotated credentials are returned so the
    product can verify any ``X-SA-Key-Id`` it sees across a key rotation.
    """
    credentials = [
        {
            'key_id': c.key_id,
            'public_pem': c.public_pem,
            'fingerprint': c.fingerprint,
            'is_active': c.is_active,
            'delivered_to_product_at': (
                c.delivered_to_product_at.isoformat()
                if c.delivered_to_product_at else None
            ),
        }
        for c in ProductCredential.objects.filter(product=product).order_by('-created_at')
    ]
    active_theme = get_active_theme(product)
    branding_by_theme = get_all_theme_branding(product)
    return {
        'product': {
            'id': product.id,
            'name': product.name,
            'status': product.status,
        },
        # Active theme's branding (back-compat) + per-theme branding so the product
        # can apply the right palette immediately when its live theme changes.
        'branding': branding_by_theme.get(active_theme),
        'branding_by_theme': branding_by_theme,
        'theme': {
            'active_theme': active_theme,
            'known_themes': THEME_KEYS,
        },
        'credentials': credentials,
    }


def _product_for_api_key(token: str) -> Product | None:
    """Resolve the product a bare ``X-Product-Token`` (api_key) belongs to.

    The api_key is a high-entropy per-product secret, so it doubles as the
    product identifier — no slug is needed. Comparison is constant-time over the
    (tiny) set of products that have a key so a wrong token can't be probed by
    timing.
    """
    if not token:
        return None
    for product in Product.objects.exclude(api_key__isnull=True).exclude(api_key=''):
        if hmac.compare_digest(token, product.api_key):
            return product
    return None


@require_http_methods(['GET'])
def product_config_self(request):
    """Deliver the calling product's config, identified purely by its api_key.

    Key-oriented: the product sends ``X-Product-Token: <api_key>`` and Super Admin
    resolves *which* product that is from the key itself. No slug is exchanged, so
    a product only needs to hold its key to pull its own config — and one product's
    key can never read another's.
    """
    token = request.META.get('HTTP_X_PRODUCT_TOKEN', '')
    product = _product_for_api_key(token)
    if not product:
        return JsonResponse({'error': 'Invalid product token'}, status=401)
    return JsonResponse(_product_config_payload(product))


# --- Cross-tenant inspection ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_users(request, product_id):
    from core.models import User as TenantUser

    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    alias = tenant_db_alias_for(product.id)
    from services.tenant_resolver import resolve_tenant
    resolve_tenant(header_key=product.api_key)
    with use_tenant(str(product.id), alias):
        users = list(
            TenantUser.objects.order_by('-created_at')[:100].values(
                'id', 'username', 'full_name', 'phone', 'role', 'account_status', 'created_at'
            )
        )
    for u in users:
        if u.get('created_at'):
            u['created_at'] = u['created_at'].isoformat()
    return JsonResponse(users, safe=False)


# --- Cross-tenant data explorer ---
# Read-only inspection of a product's isolated tenant database. Each dataset maps
# to a tenant table (core.models) and exposes the columns safe to surface in the
# Super Admin console (secrets like password hashes / 2FA secrets are excluded).
# All queries run inside ``use_tenant`` so the ORM is routed to the tenant DB.

# datakey -> (model import path, ordering, [columns]). Columns are passed to
# ``.values(...)`` so only whitelisted fields ever leave the tenant DB.
_DATASETS = {
    'users': {
        'label': 'Users',
        'model': 'core.models.User',
        'order': '-created_at',
        'columns': ['id', 'username', 'email', 'country_code', 'phone', 'full_name',
                    'role', 'account_status', 'last_login_at', 'created_at'],
    },
    'user_settings': {
        'label': 'User Settings',
        'model': 'core.models.UserSetting',
        'order': '-created_at',
        'columns': ['id', 'user_id', 'date_of_birth', 'gender', 'kyc_status',
                    'email_verified', 'phone_verified', 'two_factor_enabled',
                    'currency', 'registration_path', 'fraud_score', 'is_demo',
                    'created_at'],
    },
    'wallets': {
        'label': 'Wallets',
        'model': 'core.models.Wallet',
        'order': '-updated_at',
        'columns': ['id', 'user_id', 'main_balance', 'bonus_balance',
                    'exposure_balance', 'locked_balance', 'currency', 'updated_at'],
    },
    'transactions': {
        'label': 'Transactions',
        'model': 'core.models.Transaction',
        'order': '-created_at',
        'columns': ['id', 'user_id', 'type', 'amount', 'currency', 'status',
                    'payment_method', 'reference_number', 'created_at'],
    },
    'bets': {
        'label': 'Bets',
        'model': 'core.models.Bet',
        'order': '-created_at',
        'columns': ['id', 'user_id', 'game_id', 'bet_amount', 'odds', 'payout',
                    'status', 'created_at'],
    },
    'games': {
        'label': 'Games',
        'model': 'core.models.Game',
        'order': 'sort_order',
        'columns': ['id', 'provider_id', 'name', 'slug', 'category', 'rtp',
                    'min_bet', 'max_bet', 'is_featured', 'is_active_web',
                    'play_count', 'created_at'],
    },
    'game_providers': {
        'label': 'Game Providers',
        'model': 'core.models.GameProvider',
        'order': 'name',
        'columns': ['id', 'name', 'slug', 'is_active', 'created_at'],
    },
    'bonuses': {
        'label': 'Bonuses',
        'model': 'core.models.Bonus',
        'order': '-created_at',
        'columns': ['id', 'name', 'display_title', 'bonus_type', 'value_type',
                    'value_amount', 'min_deposit', 'wagering_multiplier', 'status',
                    'start_date', 'end_date', 'created_at'],
    },
    'ai_call_logs': {
        'label': 'AI Call Logs',
        'model': 'core.models.AiCallLog',
        'order': '-created_at',
        'columns': ['id', 'user_id', 'voice_executive_id', 'duration_seconds',
                    'deposit_intent', 'deposit_amount', 'status', 'created_at'],
    },
    'platform_settings': {
        'label': 'Platform Settings',
        'model': 'core.models.PlatformSetting',
        'order': 'setting_key',
        'columns': ['id', 'setting_key', 'setting_value', 'updated_at'],
    },
}

_DATASET_ORDER = list(_DATASETS.keys())
_MAX_PAGE_SIZE = 200
_DEFAULT_PAGE_SIZE = 50


def _import_model(path: str):
    module_path, _, name = path.rpartition('.')
    mod = __import__(module_path, fromlist=[name])
    return getattr(mod, name)


def _jsonable(value):
    """Coerce ORM values to JSON-serialisable primitives."""
    from datetime import date, datetime
    from decimal import Decimal
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _activate_tenant(product):
    """Resolve + activate the tenant DB connection for a product.

    Verifies the connection using the product's secret ``api_key``. Returns the
    Django connection alias for the product's tenant database.
    """
    from services.tenant_resolver import resolve_tenant
    resolve_tenant(header_key=product.api_key if product else None)
    return tenant_db_alias_for(product.id)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_data_summary(request, product_id):
    """High-level counts + balance/financial totals from a product's tenant DB.

    Drives the stat cards on the product data explorer. Returns a `datasets`
    list (key + label + row count) plus headline aggregates."""
    from django.db.models import Count, Sum

    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)

    alias = _activate_tenant(product)
    datasets = []
    aggregates = {}
    with use_tenant(str(product.id), alias):
        try:
            for key in _DATASET_ORDER:
                cfg = _DATASETS[key]
                model = _import_model(cfg['model'])
                datasets.append({
                    'key': key,
                    'label': cfg['label'],
                    'count': model.objects.count(),
                })

            from core.models import User, Wallet, Transaction
            wallet_totals = Wallet.objects.aggregate(
                main=Sum('main_balance'), bonus=Sum('bonus_balance'),
                locked=Sum('locked_balance'),
            )
            tx_by_status = {
                row['status']: {'count': row['n'], 'amount': float(row['total'] or 0)}
                for row in Transaction.objects.values('status').annotate(
                    n=Count('id'), total=Sum('amount'))
            }
            aggregates = {
                'total_main_balance': float(wallet_totals['main'] or 0),
                'total_bonus_balance': float(wallet_totals['bonus'] or 0),
                'total_locked_balance': float(wallet_totals['locked'] or 0),
                'users_by_status': {
                    row['account_status']: row['n']
                    for row in User.objects.values('account_status').annotate(n=Count('id'))
                },
                'transactions_by_status': tx_by_status,
            }
        except Exception as e:
            return _error(f'Could not read tenant database: {e}', 502)

    return JsonResponse({
        'id': product.id,
        'name': product.name,
        'status': product.status,
        'datasets': datasets,
        'aggregates': aggregates,
    })


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_dataset(request, product_id, dataset):
    """Paginated rows for a single tenant dataset.

    Query params: ``page`` (1-based), ``page_size`` (<= 200), ``q`` (substring
    match against text columns). Returns whitelisted columns only."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    cfg = _DATASETS.get(dataset)
    if not cfg:
        return _error('Unknown dataset', 404)

    try:
        page = max(1, int(request.GET.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(request.GET.get('page_size', _DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        page_size = _DEFAULT_PAGE_SIZE
    page_size = max(1, min(page_size, _MAX_PAGE_SIZE))
    search = (request.GET.get('q') or '').strip()

    alias = _activate_tenant(product)
    with use_tenant(str(product.id), alias):
        try:
            model = _import_model(cfg['model'])
            qs = model.objects.all()
            if search:
                from django.db.models import Q
                text_fields = _text_columns(model, cfg['columns'])
                if text_fields:
                    cond = Q()
                    for f in text_fields:
                        cond |= Q(**{f'{f}__icontains': search})
                    qs = qs.filter(cond)
            total = qs.count()
            qs = qs.order_by(cfg['order'])
            start = (page - 1) * page_size
            rows = list(qs[start:start + page_size].values(*cfg['columns']))
        except Exception as e:
            return _error(f'Could not read tenant database: {e}', 502)

    for row in rows:
        for col, val in row.items():
            row[col] = _jsonable(val)

    return JsonResponse({
        'id': product.id,
        'dataset': dataset,
        'label': cfg['label'],
        'columns': cfg['columns'],
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': max(1, (total + page_size - 1) // page_size),
        'rows': rows,
    })


# --- Cross-tenant game controls (write) ---
# Unlike the read-only explorer above, this mutates one field on one game row in
# the product's tenant DB. Game *activation* (visibility on the product web/app)
# is a Super Admin control; the product admin can only add/edit games. Toggling
# ``is_active_web`` here is reflected immediately by the product frontend, which
# reads the same column.

@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_game_active(request, product_id, game_id):
    """Activate/deactivate a single game on the product web/app.

    Body: ``{"is_active_web": bool}``. Flips ``games.is_active_web`` for the given
    game in the product's tenant DB and returns the updated row (same whitelisted
    columns as the ``games`` dataset) so the console can update it in place.
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)

    body = _json_body(request)
    if 'is_active_web' not in body:
        return _error("Missing 'is_active_web'", 400)
    is_active_web = bool(body['is_active_web'])

    cfg = _DATASETS['games']
    alias = _activate_tenant(product)
    with use_tenant(str(product.id), alias):
        try:
            from core.models import Game
            game = Game.objects.filter(id=game_id).first()
            if not game:
                return _error('Game not found', 404)
            if game.is_active_web != is_active_web:
                game.is_active_web = is_active_web
                game.save(update_fields=['is_active_web', 'updated_at'])
            row = Game.objects.filter(id=game_id).values(*cfg['columns']).first()
        except Exception as e:
            return _error(f'Could not update tenant database: {e}', 502)

    for col, val in row.items():
        row[col] = _jsonable(val)

    return JsonResponse({'id': product.id, 'game': row})


def _text_columns(model, columns):
    """Whitelisted columns that are CharField/TextField/EmailField — searchable."""
    from django.db.models import CharField, EmailField, SlugField, TextField
    searchable = (CharField, EmailField, SlugField, TextField)
    out = []
    for col in columns:
        field_name = col[:-3] if col.endswith('_id') else col
        try:
            field = model._meta.get_field(field_name)
        except Exception:
            continue
        if isinstance(field, searchable):
            out.append(col)
    return out


# --- Connection testing ---
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


# A browser-like User-Agent: some WAFs / bot filters in front of a product's
# backend hold or challenge unknown agents (surfacing here as a read timeout)
# while letting real browsers through. Accept a slow first response too — a
# cold backend (e.g. one that loads ML models on boot) can take well over 10s
# to answer its first request even though it is perfectly reachable.
_HEALTHCHECK_UA = (
    'Mozilla/5.0 (compatible; SuperAdmin-HealthCheck/1.0; '
    '+https://superadmin) Safari/537.36'
)


def _test_http_url(url: str) -> dict:
    timeout = int(getattr(settings, 'HEALTHCHECK_HTTP_TIMEOUT', 30))
    last_err: Exception | None = None
    # Retry once: absorbs a cold-start miss where the worker warms up on the
    # first hit and answers the second quickly.
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, method='GET')
            req.add_header('User-Agent', _HEALTHCHECK_UA)
            req.add_header('Accept', '*/*')
            with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
                return {'status': 'ok', 'message': f'Reachable (HTTP {resp.status})'}
        except urllib.error.HTTPError as e:
            # Any HTTP response (even 4xx/5xx) proves the host is reachable.
            if e.code < 500:
                return {'status': 'ok', 'message': f'Reachable (HTTP {e.code})'}
            return {'status': 'error', 'message': f'Server error (HTTP {e.code})'}
        except urllib.error.URLError as e:
            last_err = e
            reason = getattr(e, 'reason', e)
            # DNS / connection-refused won't fix on retry — fail fast.
            if not isinstance(reason, TimeoutError) and 'timed out' not in str(reason):
                return {'status': 'error', 'message': str(reason)}
        except TimeoutError as e:
            last_err = e
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    reason = getattr(last_err, 'reason', last_err)
    return {
        'status': 'error',
        'message': f'No response within {timeout}s ({reason}). The host may be '
                   f'slow to start or behind a firewall.',
    }


def _test_db(*, host: str, port: int, user: str, password: str, db_name: str) -> dict:
    import MySQLdb
    try:
        conn = MySQLdb.connect(
            host=host, port=port, user=user,
            passwd=password, db=db_name, connect_timeout=10,
        )
        conn.close()
        return {'status': 'ok', 'message': 'Connected successfully'}
    except MySQLdb.Error as e:
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def test_connection(request):
    body = _json_body(request)
    test_type = body.get('type', '')

    if test_type in ('fe_url', 'be_url'):
        url = body.get('url', '').strip()
        if not url:
            return JsonResponse({'status': 'error', 'message': 'URL is required'})
        return JsonResponse(_test_http_url(url))

    if test_type == 'database':
        host = body.get('db_host', '').strip()
        port = int(body.get('db_port') or 3306)
        user = body.get('db_user', '').strip()
        password = body.get('db_password', '')
        db_name = body.get('db_name', '').strip()
        if not (host and user and db_name):
            return JsonResponse({'status': 'error', 'message': 'db_host, db_user, and db_name are required'})
        return JsonResponse(_test_db(host=host, port=port, user=user, password=password, db_name=db_name))

    return JsonResponse({'status': 'error', 'message': 'Unknown test type'}, status=400)


# --- Product webhook credentials (RSA key pair) ---
# The credential secures the Super Admin -> Product data channel: Super Admin signs
# every data pull with the product's private key; the product verifies with the
# public key. This replaces Super Admin connecting to the tenant DB directly.

@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_credential(request, product_id):
    """Return the product's active credential (public material only)."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    cred = get_active_credential(product)
    if not cred:
        return JsonResponse({'id': product.id, 'credential': None})
    return JsonResponse({'id': product.id, 'credential': serialize_credential(cred)})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_credential_generate(request, product_id):
    """Issue the first credential for a product (no-op if one already exists).

    Returns the private key **once** so the operator can hand it off; afterwards
    only the public key is retrievable. Use rotate to replace an existing key.
    """
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    existing = get_active_credential(product)
    cred = issue_credential(product)
    # Only reveal the private key when we actually just created it.
    reveal = existing is None
    return JsonResponse({
        'id': product.id,
        'created': reveal,
        'credential': serialize_credential(cred, include_private=reveal),
    }, status=201 if reveal else 200)


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_credential_rotate(request, product_id):
    """Retire the active key pair and issue a new one. Returns the new private key
    once. The product must install the new public key before pulls resume."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    cred = rotate_credential(product)
    return JsonResponse({
        'id': product.id,
        'rotated': True,
        'credential': serialize_credential(cred, include_private=True),
    }, status=201)


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_credential_mark_delivered(request, product_id):
    """Mark that the product has installed the active public key (handshake)."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    cred = get_active_credential(product)
    if not cred:
        return _error('No active credential to mark', 404)
    mark_delivered(cred)
    return JsonResponse({'id': product.id, 'credential': serialize_credential(cred)})


# --- Webhook-based data fetch (PULL) ---
# Same datasets as the direct-DB explorer, but fetched over the signed webhook
# instead of opening the tenant database. The product returns the rows. The
# request/response shapes mirror ``product_data_summary`` / ``product_dataset`` so
# the frontend can switch sources with minimal change.

@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_webhook_summary(request, product_id):
    """High-level counts + aggregates pulled from the product over the webhook."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    try:
        data = call_product(product, 'data.summary')
    except WebhookError as e:
        return _error(str(e), e.http_status or 502)
    return JsonResponse(data)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_webhook_dataset(request, product_id, dataset):
    """Paginated rows for one dataset, pulled from the product over the webhook."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    if dataset not in _DATASETS:
        return _error('Unknown dataset', 404)
    query = {
        'page': request.GET.get('page', '1'),
        'page_size': request.GET.get('page_size', str(_DEFAULT_PAGE_SIZE)),
    }
    if request.GET.get('q'):
        query['q'] = request.GET['q']
    try:
        data = call_product(product, f'data.{dataset}', query=query)
    except WebhookError as e:
        return _error(str(e), e.http_status or 502)
    return JsonResponse(data)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_webhook_deliveries(request, product_id):
    """Recent signed-webhook calls made to this product (audit trail)."""
    product = Product.objects.filter(id=product_id).first()
    if not product:
        return _error('Product not found', 404)
    try:
        limit = max(1, min(int(request.GET.get('limit', 50)), 200))
    except (TypeError, ValueError):
        limit = 50
    rows = list(
        WebhookDelivery.objects.filter(product=product)
        .order_by('-created_at')[:limit]
        .values('id', 'resource', 'request_method', 'request_path', 'status',
                'http_status', 'duration_ms', 'error', 'created_at')
    )
    for r in rows:
        if r.get('created_at'):
            r['created_at'] = r['created_at'].isoformat()
    return JsonResponse({'id': product.id, 'deliveries': rows}, safe=False)
