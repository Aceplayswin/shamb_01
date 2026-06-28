"""Super Admin control-plane API.

All super-admin endpoints operate on the master database and are guarded by the
``super_admin`` role. Endpoints that inspect a specific tenant switch into that
tenant's database context explicitly.
"""

import json
import ssl
import urllib.error
import urllib.request
from datetime import timedelta

import bcrypt
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from tenants.auth_jwt import sign_token
from tenants.auth_middleware import require_auth
from services.branding import BRANDING_FIELDS, get_branding_for_product, serialize_branding
from services.tenant_provisioning import ProvisioningError, provision_product
from services.tenant_resolver import invalidate_tenant_cache
from tenants.models import Branding, Database, Product, ProductTheme, Url, User, UserSession
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
    branding = Branding.objects.filter(product=product).first()
    theme_rows = _product_theme_rows(product)
    active = next((r['theme_key'] for r in theme_rows if r['is_active']), DEFAULT_THEME)
    branding_data = serialize_branding(product, branding)
    return {
        'id': product.id,
        'slug': product.slug,
        'name': product.name,
        'status': product.status,
        'created_at': product.created_at.isoformat(),
        'themes': theme_rows,
        'active_theme': active,
        'branding': branding_data,
        'urls': {
            'fe_url': url_obj.fe_url if url_obj else '',
            'be_url': url_obj.be_url if url_obj else '',
        },
        'database': {
            'db_name': db.db_name if db else None,
            'db_host': db.db_host if db else None,
            'is_provisioned': db.is_provisioned if db else False,
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
        slug = body['slug'].strip().lower()
        name = body['name'].strip()
    except (KeyError, json.JSONDecodeError) as e:
        return _error(e)
    if Product.objects.filter(slug=slug).exists():
        return _error('A product with this slug already exists', 409)
    db = body.get('database') or {}
    urls = body.get('urls') or {}
    try:
        product = provision_product(
            slug=slug,
            name=name,
            db_name=db.get('db_name'),
            db_host=db.get('db_host'),
            db_port=db.get('db_port'),
            db_user=db.get('db_user'),
            db_password=db.get('db_password'),
            fe_url=urls.get('fe_url', ''),
            be_url=urls.get('be_url', ''),
            branding=body.get('branding'),
            seed=body.get('seed', True),
        )
    except ProvisioningError as e:
        return _error(f'Provisioning failed: {e}', 500)
    invalidate_tenant_cache(slug)
    return JsonResponse(_serialize_product(product), status=201)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_detail(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_update(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    body = _json_body(request)
    old_slug = product.slug
    if 'slug' in body:
        new_slug = body['slug'].strip().lower()
        if new_slug != product.slug:
            if Product.objects.filter(slug=new_slug).exclude(pk=product.pk).exists():
                return _error('A product with this slug already exists', 409)
            product.slug = new_slug
    if 'name' in body:
        product.name = body['name']
    if 'status' in body and body['status'] in dict(Product.Status.choices):
        product.status = body['status']
    product.save(update_fields=['slug', 'name', 'status', 'updated_at'])
    invalidate_tenant_cache(old_slug)
    invalidate_tenant_cache(product.slug)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_disable(request, slug):
    updated = Product.objects.filter(slug=slug).update(status=Product.Status.DISABLED)
    if not updated:
        return _error('Product not found', 404)
    invalidate_tenant_cache(slug)
    return JsonResponse({'slug': slug, 'status': Product.Status.DISABLED})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['DELETE'])
def product_delete(request, slug):
    """Delete the product's control-plane records. The isolated tenant database
    is intentionally NOT dropped here (irreversible); operators remove it
    manually after export."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    product.delete()
    invalidate_tenant_cache(slug)
    return JsonResponse({'deleted': True, 'slug': slug})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_provision(request, slug):
    """(Re)create + seed the tenant database for an existing product."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    db = Database.objects.filter(product=product).first()
    try:
        provision_product(
            slug=product.slug,
            name=product.name,
            db_name=db.db_name if db else None,
            db_host=db.db_host if db else None,
            db_port=db.db_port if db else None,
            db_user=db.db_user if db else None,
            db_password=db.db_password if db else None,
            seed=request.GET.get('seed', '1') != '0',
        )
    except ProvisioningError as e:
        return _error(f'Provisioning failed: {e}', 500)
    return JsonResponse(_serialize_product(product))


# --- Database ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_database_update(request, slug):
    product = Product.objects.filter(slug=slug).first()
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
        'is_provisioned': db.is_provisioned,
    })


# --- URLs ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'PUT'])
def product_urls(request, slug):
    product = Product.objects.filter(slug=slug).first()
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
    invalidate_tenant_cache(slug)
    url_obj = Url.objects.get(product=product)
    return JsonResponse({
        'fe_url': url_obj.fe_url,
        'be_url': url_obj.be_url,
    })


# --- Branding ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'PUT'])
def product_branding(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    if request.method == 'GET':
        return JsonResponse(get_branding_for_product(product))
    body = _json_body(request)
    existing = Branding.objects.filter(product=product).first()
    data = {field: getattr(existing, field) if existing else serialize_branding(product, None)[field]
            for field in BRANDING_FIELDS}
    for field in BRANDING_FIELDS:
        if field not in body:
            continue
        value = body[field]
        if field == 'extra' and value is not None and not isinstance(value, (dict, list)):
            return _error('extra must be a JSON object or array')
        data[field] = value
    if not str(data.get('product_name', '')).strip():
        return _error('product_name cannot be empty')
    Branding.objects.update_or_create(product=product, defaults=data)
    invalidate_tenant_cache(slug)
    return JsonResponse(get_branding_for_product(product))


# --- Themes ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def themes_catalog(request):
    """The full catalog of themes a product may render. Drives the super-admin UI."""
    return JsonResponse({'themes': THEME_CATALOG, 'default': DEFAULT_THEME}, safe=False)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_themes(request, slug):
    """List a product's theme rows (one per catalog theme), with active/enabled
    flags. Rows are auto-seeded if missing."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    rows = _product_theme_rows(product)
    active = next((r['theme_key'] for r in rows if r['is_active']), DEFAULT_THEME)
    return JsonResponse({'slug': slug, 'themes': rows, 'active_theme': active})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_theme_activate(request, slug):
    """Activate exactly one theme for a product (deactivates all others).

    Body: {"theme_key": "theme2"}
    """
    product = Product.objects.filter(slug=slug).first()
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
    invalidate_tenant_cache(product.slug)
    return JsonResponse({'slug': slug, 'active_theme': active, 'themes': _product_theme_rows(product)})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_theme_set_enabled(request, slug, theme_key):
    """Enable/disable a theme row for a product. A disabled theme cannot be the
    live theme; disabling the active theme moves Live to another enabled theme.

    Body: {"is_enabled": false}
    """
    product = Product.objects.filter(slug=slug).first()
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

    invalidate_tenant_cache(product.slug)
    return JsonResponse({'slug': slug, 'themes': _product_theme_rows(product)})


# --- Public (unauthenticated) branding + theme for product frontends ---
@require_http_methods(['GET'])
def public_product_branding(request, slug):
    """Public endpoint product frontends call for white-label branding."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    payload = get_branding_for_product(product)
    payload['status'] = product.status
    return JsonResponse(payload)


@require_http_methods(['GET'])
def public_product_theme(request, slug):
    """Public endpoint a product frontend calls to learn its live theme.

    Returns only the active theme key (and the known keys so the frontend can
    guard against rendering a theme it doesn't ship). No auth: this is read-only,
    non-sensitive presentation config. Disabled products report no theme so the
    frontend can show a maintenance state."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    if not product.is_active:
        return JsonResponse({'slug': slug, 'active_theme': None, 'status': product.status})
    active = get_active_theme(product)
    return JsonResponse({
        'slug': slug,
        'active_theme': active,
        'status': product.status,
        'known_themes': THEME_KEYS,
    })


# --- Cross-tenant inspection ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_users(request, slug):
    from core.models import User as TenantUser

    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    alias = tenant_db_alias_for(slug)
    from services.tenant_resolver import resolve_tenant
    resolve_tenant(header_slug=slug)
    with use_tenant(slug, alias):
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


def _activate_tenant(slug):
    """Resolve + activate the tenant DB connection for a product slug."""
    from services.tenant_resolver import resolve_tenant
    resolve_tenant(header_slug=slug)
    return tenant_db_alias_for(slug)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_data_summary(request, slug):
    """High-level counts + balance/financial totals from a product's tenant DB.

    Drives the stat cards on the product data explorer. Returns a `datasets`
    list (key + label + row count) plus headline aggregates."""
    from django.db.models import Count, Sum

    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)

    alias = _activate_tenant(slug)
    datasets = []
    aggregates = {}
    with use_tenant(slug, alias):
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
        'slug': slug,
        'name': product.name,
        'status': product.status,
        'datasets': datasets,
        'aggregates': aggregates,
    })


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_dataset(request, slug, dataset):
    """Paginated rows for a single tenant dataset.

    Query params: ``page`` (1-based), ``page_size`` (<= 200), ``q`` (substring
    match against text columns). Returns whitelisted columns only."""
    product = Product.objects.filter(slug=slug).first()
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

    alias = _activate_tenant(slug)
    with use_tenant(slug, alias):
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
        'slug': slug,
        'dataset': dataset,
        'label': cfg['label'],
        'columns': cfg['columns'],
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': max(1, (total + page_size - 1) // page_size),
        'rows': rows,
    })


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


def _test_http_url(url: str) -> dict:
    try:
        req = urllib.request.Request(url, method='GET')
        req.add_header('User-Agent', 'SuperAdmin-HealthCheck/1.0')
        with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
            return {'status': 'ok', 'message': f'Reachable (HTTP {resp.status})'}
    except urllib.error.HTTPError as e:
        if e.code < 500:
            return {'status': 'ok', 'message': f'Reachable (HTTP {e.code})'}
        return {'status': 'error', 'message': f'Server error (HTTP {e.code})'}
    except urllib.error.URLError as e:
        return {'status': 'error', 'message': str(e.reason)}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


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
