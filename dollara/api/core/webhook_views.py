"""Super Admin -> Product signed-webhook data endpoint (Phase 2, product side).

Super Admin no longer opens a MySQL connection into this product's tenant
database. Instead it sends a signed HTTPS GET to::

    /api/v1/webhooks/super-admin/data/<resource>

This module verifies that signature (proving the request came from Super Admin and
was not tampered with), then reads **this product's own** database and returns the
exact JSON shapes the Super Admin console expects — the same shapes produced by
``product_data_summary`` / ``product_dataset`` in
``super_admin/api/tenants/views.py``.

``<resource>`` is either ``summary`` (counts + aggregates) or a dataset key from
``_DATASETS`` (paginated rows). ``_DATASETS`` mirrors the Super Admin whitelist
column-for-column so the two sides cannot drift; secret columns (password hashes,
2FA secrets) are never selected.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.db.models import (CharField, Count, EmailField, Q, SlugField, Sum,
                              TextField)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.models import (AiCallLog, Bet, Bonus, Game, GameProvider,
                         PlatformSetting, Transaction, User, UserSetting, Wallet)
from services.super_admin_keys import resolve_signing_key
from services.webhook_verify import (HEADER_KEY_ID, SignatureError,
                                     verify_incoming)
from services.tenant_resolver import resolve_tenant
from tenants.state import use_tenant

# dataset key -> (model, ordering, whitelisted columns). Mirrors ``_DATASETS`` in
# super_admin/api/tenants/views.py byte-for-byte (same keys, labels, order,
# columns) so the console renders identical results whichever source it pulls from.
_DATASETS = {
    'users': {
        'label': 'Users',
        'model': User,
        'order': '-created_at',
        'columns': ['id', 'username', 'email', 'country_code', 'phone', 'full_name',
                    'role', 'account_status', 'last_login_at', 'created_at'],
    },
    'user_settings': {
        'label': 'User Settings',
        'model': UserSetting,
        'order': '-created_at',
        'columns': ['id', 'user_id', 'date_of_birth', 'gender', 'kyc_status',
                    'email_verified', 'phone_verified', 'two_factor_enabled',
                    'currency', 'registration_path', 'fraud_score', 'is_demo',
                    'created_at'],
    },
    'wallets': {
        'label': 'Wallets',
        'model': Wallet,
        'order': '-updated_at',
        'columns': ['id', 'user_id', 'main_balance', 'bonus_balance',
                    'exposure_balance', 'locked_balance', 'currency', 'updated_at'],
    },
    'transactions': {
        'label': 'Transactions',
        'model': Transaction,
        'order': '-created_at',
        'columns': ['id', 'user_id', 'type', 'amount', 'currency', 'status',
                    'payment_method', 'reference_number', 'created_at'],
    },
    'bets': {
        'label': 'Bets',
        'model': Bet,
        'order': '-created_at',
        'columns': ['id', 'user_id', 'game_id', 'bet_amount', 'odds', 'payout',
                    'status', 'created_at'],
    },
    'games': {
        'label': 'Games',
        'model': Game,
        'order': 'sort_order',
        'columns': ['id', 'provider_id', 'name', 'slug', 'category', 'rtp',
                    'min_bet', 'max_bet', 'is_featured', 'is_active_web',
                    'play_count', 'created_at'],
    },
    'game_providers': {
        'label': 'Game Providers',
        'model': GameProvider,
        'order': 'name',
        'columns': ['id', 'name', 'slug', 'is_active', 'created_at'],
    },
    'bonuses': {
        'label': 'Bonuses',
        'model': Bonus,
        'order': '-created_at',
        'columns': ['id', 'name', 'display_title', 'bonus_type', 'value_type',
                    'value_amount', 'min_deposit', 'wagering_multiplier', 'status',
                    'start_date', 'end_date', 'created_at'],
    },
    'ai_call_logs': {
        'label': 'AI Call Logs',
        'model': AiCallLog,
        'order': '-created_at',
        'columns': ['id', 'user_id', 'voice_executive_id', 'duration_seconds',
                    'deposit_intent', 'deposit_amount', 'status', 'created_at'],
    },
    'platform_settings': {
        'label': 'Platform Settings',
        'model': PlatformSetting,
        'order': 'setting_key',
        'columns': ['id', 'setting_key', 'setting_value', 'updated_at'],
    },
}

_MAX_PAGE_SIZE = 200
_DEFAULT_PAGE_SIZE = 50


def _error(message: str, status: int):
    return JsonResponse({'error': message}, status=status)


def _jsonable(value):
    """Coerce ORM values to JSON-serialisable primitives."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _text_columns(model, columns):
    """Whitelisted columns that are CharField/TextField/EmailField — searchable."""
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


def _received_path(request) -> str:
    """The request path + query string exactly as received — the same string Super
    Admin signed. Built from the raw WSGI values to avoid any re-encoding."""
    qs = request.META.get('QUERY_STRING', '')
    return request.path + ('?' + qs if qs else '')


def _summary_payload(slug: str, name: str, status: str, alias: str) -> dict:
    datasets = []
    with use_tenant(slug, alias):
        for key, cfg in _DATASETS.items():
            datasets.append({
                'key': key,
                'label': cfg['label'],
                'count': cfg['model'].objects.count(),
            })

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

    return {
        'slug': slug,
        'name': name,
        'status': status,
        'datasets': datasets,
        'aggregates': aggregates,
    }


def _dataset_payload(dataset: str, slug: str, alias: str, params) -> dict:
    cfg = _DATASETS[dataset]
    try:
        page = max(1, int(params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = int(params.get('page_size', _DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        page_size = _DEFAULT_PAGE_SIZE
    page_size = max(1, min(page_size, _MAX_PAGE_SIZE))
    search = (params.get('q') or '').strip()

    with use_tenant(slug, alias):
        model = cfg['model']
        qs = model.objects.all()
        if search:
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

    for row in rows:
        for col, val in row.items():
            row[col] = _jsonable(val)

    return {
        'slug': slug,
        'dataset': dataset,
        'label': cfg['label'],
        'columns': cfg['columns'],
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': max(1, (total + page_size - 1) // page_size),
        'rows': rows,
    }


@csrf_exempt
@require_http_methods(['GET'])
def super_admin_data_webhook(request, resource):
    """Verify a signed Super Admin pull and serve it from this product's own DB."""
    # 1. Identify the signing key from the request and look up its public half.
    key_id = request.headers.get(HEADER_KEY_ID, '')
    if not key_id:
        return _error('Missing X-SA-Key-Id', 401)
    key = resolve_signing_key(key_id)
    if not key:
        return _error('Unknown signing key', 401)

    # 2. Verify the signature (replay window + RSA-PSS over the canonical string).
    try:
        verify_incoming(
            public_pem=key.public_pem,
            method=request.method,
            path=_received_path(request),
            headers=request.headers,
            body=request.body or b'',
        )
    except SignatureError as e:
        return _error(str(e), 401)

    # 3. Resolve THIS product from its control-plane config (key-oriented). The
    #    verified signature already proves the request targets this product — the
    #    key_id was matched against this product's own credential set — so no slug
    #    needs to be exchanged or cross-checked.
    resolved = resolve_tenant()
    if not resolved:
        return _error('Product not resolved; control-plane config unavailable', 503)
    slug = resolved.slug
    # Feature data lives on the ``default`` connection (this instance serves one
    # product); ``None`` lets the router target it.
    alias = resolved.db_alias or None

    # 4. Read this product's OWN database and return the console's JSON shapes.
    try:
        if resource == 'summary':
            payload = _summary_payload(slug, resolved.name, resolved.status, alias)
        elif resource in _DATASETS:
            payload = _dataset_payload(resource, slug, alias, request.GET)
        else:
            return _error('Unknown dataset', 404)
    except Exception as e:
        return _error(f'Could not read product database: {e}', 502)

    return JsonResponse(payload)
