"""Admin-only business logic for the management panel."""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.files.storage import default_storage
from django.db.models import Count, Q, Sum
from django.utils import timezone

from core.models import (
    AiCallLog,
    Bet,
    Bonus,
    Game,
    GameProvider,
    PlatformSetting,
    Transaction,
    User,
    UserSetting,
    Wallet,
)
from core.services import get_user_settings
from tenants.state import get_current_tenant_id, tenant_atomic

UPLOAD_ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'}
UPLOAD_MAX_BYTES = 5 * 1024 * 1024


def upload_admin_image(file) -> str:
    """Save an admin-uploaded image (game thumbnail, provider logo) and return
    its storage path. Caller turns this into an absolute URL."""
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
    if ext not in UPLOAD_ALLOWED_EXTENSIONS:
        raise ValueError(f'Unsupported file type: .{ext or "unknown"}')
    if file.size > UPLOAD_MAX_BYTES:
        raise ValueError('File too large (max 5MB)')

    tenant_key = get_current_tenant_id() or 'default'
    filename = f'{uuid.uuid4().hex}.{ext}'
    path = default_storage.save(f'uploads/{tenant_key}/{filename}', file)
    return default_storage.url(path)


def _serialize_user(u: User, wallet: Wallet | None = None, user_settings: UserSetting | None = None) -> dict:
    prefs = user_settings
    return {
        'id': u.id,
        'username': u.username,
        'full_name': u.full_name,
        'phone': u.phone,
        'email': u.email,
        'country_code': u.country_code,
        'currency': prefs.currency if prefs else 'INR',
        'kyc_status': prefs.kyc_status if prefs else UserSetting.KycStatus.NONE,
        'account_status': u.account_status,
        'email_verified': prefs.email_verified if prefs else False,
        'phone_verified': prefs.phone_verified if prefs else False,
        'fraud_score': prefs.fraud_score if prefs else 0,
        'is_demo': prefs.is_demo if prefs else False,
        'created_at': u.created_at.isoformat(),
        'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
        'main_balance': float(wallet.main_balance) if wallet else 0,
        'bonus_balance': float(wallet.bonus_balance) if wallet else 0,
        'locked_balance': float(wallet.locked_balance) if wallet else 0,
    }


def get_user_detail(user_id: int) -> dict:
    user = User.objects.select_related('wallet', 'usersetting').get(id=user_id)
    try:
        wallet = user.wallet
    except Wallet.DoesNotExist:
        wallet = None
    return _serialize_user(user, wallet, get_user_settings(user))


def update_user_admin(
    user_id: int,
    *,
    account_status: str | None = None,
    kyc_status: str | None = None,
    fraud_score: int | None = None,
) -> dict:
    user_updates = {}
    settings_updates = {}
    if account_status is not None:
        user_updates['account_status'] = account_status
    if kyc_status is not None:
        settings_updates['kyc_status'] = kyc_status
    if fraud_score is not None:
        settings_updates['fraud_score'] = fraud_score
    if not user_updates and not settings_updates:
        raise ValueError('No fields to update')
    if user_updates:
        User.objects.filter(id=user_id).update(**user_updates)
    if settings_updates:
        UserSetting.objects.filter(user_id=user_id).update(**settings_updates)
    return get_user_detail(user_id)


def list_admin_transactions(
    tx_type: str | None = None,
    status: str | None = None,
    user_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    qs = Transaction.objects.select_related('user').order_by('-created_at')
    if tx_type:
        qs = qs.filter(type=tx_type)
    if status:
        qs = qs.filter(status=status)
    if user_id:
        qs = qs.filter(user_id=user_id)
    return [
        {
            'id': t.id,
            'user_id': t.user_id,
            'username': t.user.username,
            'full_name': t.user.full_name,
            'type': t.type,
            'amount': float(t.amount),
            'currency': t.currency,
            'status': t.status,
            'payment_method': t.payment_method,
            'reference_number': t.reference_number,
            'notes': t.notes,
            'created_at': t.created_at.isoformat(),
        }
        for t in qs[offset : offset + limit]
    ]


def list_pending_deposits(limit: int = 100) -> list[dict]:
    return list_admin_transactions(
        tx_type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.PENDING,
        limit=limit,
    )


def list_admin_games(limit: int = 200, offset: int = 0) -> list[dict]:
    qs = Game.objects.select_related('provider').order_by('sort_order', 'name')[
        offset : offset + limit
    ]
    return [
        {
            'id': g.id,
            'name': g.name,
            'slug': g.slug,
            'category': g.category,
            'game_uid': g.game_uid,
            'game_type': g.game_type,
            'provider_id': g.provider_id,
            'provider_name': g.provider.name if g.provider else None,
            'thumbnail_url': g.thumbnail_url,
            'rtp': float(g.rtp) if g.rtp else None,
            'min_bet': float(g.min_bet),
            'max_bet': float(g.max_bet),
            'is_featured': g.is_featured,
            'is_active_web': g.is_active_web,
            'is_active': g.is_active,
            'is_provably_fair': g.is_provably_fair,
            'sort_order': g.sort_order,
            'play_count': g.play_count,
        }
        for g in qs
    ]


def create_game(data: dict) -> dict:
    game = Game.objects.create(
        provider_id=data.get('provider_id') or None,
        name=data['name'],
        slug=data['slug'],
        category=data['category'],
        game_uid=data.get('game_uid') or None,
        game_type=data.get('game_type') or None,
        thumbnail_url=data.get('thumbnail_url'),
        rtp=Decimal(str(data['rtp'])) if data.get('rtp') is not None else None,
        min_bet=Decimal(str(data.get('min_bet', 10))),
        max_bet=Decimal(str(data.get('max_bet', 100000))),
        is_featured=bool(data.get('is_featured', False)),
        is_active_web=bool(data.get('is_active_web', True)),
        is_active=bool(data.get('is_active', True)),
        is_provably_fair=bool(data.get('is_provably_fair', False)),
        sort_order=int(data.get('sort_order', 0)),
    )
    return {'id': game.id}


def update_game(game_id: int, data: dict) -> dict:
    allowed = {
        'name', 'slug', 'category', 'provider_id', 'thumbnail_url',
        'rtp', 'min_bet', 'max_bet', 'is_featured', 'is_active_web',
        'is_active', 'is_provably_fair', 'sort_order', 'game_uid', 'game_type',
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    if 'provider_id' in updates and updates['provider_id'] == '':
        updates['provider_id'] = None
    for key in ('rtp', 'min_bet', 'max_bet'):
        if key in updates and updates[key] is not None:
            updates[key] = Decimal(str(updates[key]))
    if updates:
        Game.objects.filter(id=game_id).update(**updates)
    return {'updated': True}


def list_admin_providers() -> list[dict]:
    return [
        {
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'logo_url': p.logo_url,
            'is_active': p.is_active,
            'created_at': p.created_at.isoformat(),
        }
        for p in GameProvider.objects.order_by('name')
    ]


def create_provider(data: dict) -> dict:
    provider = GameProvider.objects.create(
        name=data['name'],
        slug=data['slug'],
        logo_url=data.get('logo_url'),
        is_active=bool(data.get('is_active', True)),
    )
    return {'id': provider.id}


def update_provider(provider_id: int, data: dict) -> dict:
    allowed = {'name', 'slug', 'logo_url', 'is_active'}
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        GameProvider.objects.filter(id=provider_id).update(**updates)
    return {'updated': True}


def list_admin_bets(limit: int = 50, offset: int = 0, user_id: int | None = None) -> list[dict]:
    qs = Bet.objects.select_related('user', 'game').order_by('-created_at')
    if user_id:
        qs = qs.filter(user_id=user_id)
    return [
        {
            'id': b.id,
            'user_id': b.user_id,
            'username': b.user.username,
            'game_id': b.game_id,
            'game_name': b.game.name if b.game else None,
            'bet_amount': float(b.bet_amount),
            'odds': float(b.odds) if b.odds else None,
            'payout': float(b.payout),
            'status': b.status,
            'created_at': b.created_at.isoformat(),
        }
        for b in qs[offset : offset + limit]
    ]


def list_admin_bonuses() -> list[dict]:
    return [
        {
            'id': b.id,
            'name': b.name,
            'display_title': b.display_title,
            'bonus_type': b.bonus_type,
            'value_type': b.value_type,
            'value_amount': float(b.value_amount),
            'min_deposit': float(b.min_deposit),
            'max_bonus_cap': float(b.max_bonus_cap) if b.max_bonus_cap else None,
            'wagering_multiplier': float(b.wagering_multiplier),
            'status': b.status,
            'start_date': b.start_date.isoformat() if b.start_date else None,
            'end_date': b.end_date.isoformat() if b.end_date else None,
        }
        for b in Bonus.objects.order_by('-created_at')
    ]


def create_bonus(data: dict) -> dict:
    bonus = Bonus.objects.create(
        name=data['name'],
        display_title=data.get('display_title'),
        bonus_type=data['bonus_type'],
        value_type=data['value_type'],
        value_amount=Decimal(str(data['value_amount'])),
        min_deposit=Decimal(str(data.get('min_deposit', 0))),
        max_bonus_cap=(
            Decimal(str(data['max_bonus_cap'])) if data.get('max_bonus_cap') else None
        ),
        wagering_multiplier=Decimal(str(data.get('wagering_multiplier', 35))),
        status=data.get('status', 'draft'),
    )
    return {'id': bonus.id}


def update_bonus(bonus_id: int, data: dict) -> dict:
    allowed = {
        'name', 'display_title', 'bonus_type', 'value_type', 'value_amount',
        'min_deposit', 'max_bonus_cap', 'wagering_multiplier', 'status',
    }
    updates = {k: v for k, v in data.items() if k in allowed}
    for key in ('value_amount', 'min_deposit', 'max_bonus_cap', 'wagering_multiplier'):
        if key in updates and updates[key] is not None:
            updates[key] = Decimal(str(updates[key]))
    if updates:
        Bonus.objects.filter(id=bonus_id).update(**updates)
    return {'updated': True}


def list_platform_settings() -> list[dict]:
    return [
        {
            'key': s.setting_key,
            'value': s.setting_value,
            'updated_at': s.updated_at.isoformat(),
        }
        for s in PlatformSetting.objects.order_by('setting_key')
    ]


def update_platform_setting(key: str, value) -> dict:
    PlatformSetting.objects.update_or_create(
        setting_key=key,
        defaults={'setting_value': value},
    )
    return {'updated': True}


def list_ai_call_logs(limit: int = 50, offset: int = 0) -> list[dict]:
    qs = AiCallLog.objects.select_related('user').order_by('-created_at')[
        offset : offset + limit
    ]
    return [
        {
            'id': c.id,
            'user_id': c.user_id,
            'username': c.user.username,
            'voice_executive_id': c.voice_executive_id,
            'duration_seconds': c.duration_seconds,
            'deposit_intent': c.deposit_intent,
            'deposit_amount': float(c.deposit_amount) if c.deposit_amount else None,
            'status': c.status,
            'transcript': (c.transcript or '')[:200],
            'created_at': c.created_at.isoformat(),
        }
        for c in qs
    ]


def wallet_adjustment(user_id: int, amount: float, notes: str) -> dict:
    with tenant_atomic():
        wallet = Wallet.objects.select_for_update().get(user_id=user_id)
        delta = Decimal(str(amount))
        wallet.main_balance += delta
        wallet.save(update_fields=['main_balance', 'updated_at'])
        Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.ADJUSTMENT,
            amount=abs(delta),
            status=Transaction.Status.COMPLETED,
            notes=notes or f'Admin adjustment: {amount:+}',
        )
    return {'new_balance': float(wallet.main_balance)}


def list_admin_users_list() -> list[dict]:
    staff_roles = [User.Role.ADMIN, User.Role.SUPER_ADMIN]
    return [
        {
            'id': a.id,
            'username': a.username,
            'email': a.email,
            'role': a.role,
            'is_active': a.account_status == User.AccountStatus.ACTIVE,
            'last_login_at': a.last_login_at.isoformat() if a.last_login_at else None,
            'created_at': a.created_at.isoformat(),
        }
        for a in User.objects.filter(role__in=staff_roles).order_by('username')
    ]


def get_dashboard_charts(days: int = 7) -> dict:
    """Time-series + breakdowns to power the dashboard visualisations."""
    today = timezone.now().date()
    series = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        day_txs = Transaction.objects.filter(created_at__date=day)
        deposits = day_txs.filter(
            type=Transaction.TxType.DEPOSIT,
            status=Transaction.Status.COMPLETED,
        ).aggregate(total=Sum('amount'))['total'] or 0
        withdrawals = day_txs.filter(
            type=Transaction.TxType.WITHDRAWAL,
            status=Transaction.Status.COMPLETED,
        ).aggregate(total=Sum('amount'))['total'] or 0
        signups = User.objects.filter(
            role=User.Role.USER,
            usersetting__is_demo=False,
            created_at__date=day,
        ).count()
        series.append({
            'date': day.isoformat(),
            'label': day.strftime('%a'),
            'deposits': float(deposits),
            'withdrawals': float(withdrawals),
            'signups': signups,
        })

    category_rows = (
        Bet.objects.values('game__category')
        .annotate(count=Count('id'), volume=Sum('bet_amount'))
        .order_by('-count')
    )
    categories = [
        {
            'category': row['game__category'] or 'unknown',
            'count': row['count'],
            'volume': float(row['volume'] or 0),
        }
        for row in category_rows
        if row['game__category']
    ]

    status_rows = (
        User.objects.filter(role=User.Role.USER, usersetting__is_demo=False)
        .values('account_status')
        .annotate(count=Count('id'))
    )
    user_status = {row['account_status']: row['count'] for row in status_rows}

    return {
        'series': series,
        'categories': categories,
        'userStatus': user_status,
        'pendingWithdrawals': Transaction.objects.filter(
            type=Transaction.TxType.WITHDRAWAL,
            status__in=[Transaction.Status.PENDING, Transaction.Status.PROCESSING],
        ).count(),
        'pendingDeposits': Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            status=Transaction.Status.PENDING,
        ).count(),
        'kycPending': UserSetting.objects.filter(
            is_demo=False,
            kyc_status=UserSetting.KycStatus.PENDING,
            user__role=User.Role.USER,
        ).count(),
    }


def get_recent_activity(limit: int = 12) -> list[dict]:
    txs = (
        Transaction.objects.select_related('user')
        .order_by('-created_at')[:limit]
    )
    return [
        {
            'id': t.id,
            'type': t.type,
            'amount': float(t.amount),
            'status': t.status,
            'username': t.user.username,
            'full_name': t.user.full_name,
            'created_at': t.created_at.isoformat(),
        }
        for t in txs
    ]


def get_user_full_detail(user_id: int) -> dict:
    detail = get_user_detail(user_id)
    txs = Transaction.objects.filter(user_id=user_id).order_by('-created_at')[:20]
    bets = Bet.objects.select_related('game').filter(user_id=user_id).order_by('-created_at')[:20]
    detail['transactions'] = [
        {
            'id': t.id,
            'type': t.type,
            'amount': float(t.amount),
            'status': t.status,
            'payment_method': t.payment_method,
            'created_at': t.created_at.isoformat(),
        }
        for t in txs
    ]
    detail['bets'] = [
        {
            'id': b.id,
            'game_name': b.game.name if b.game else None,
            'bet_amount': float(b.bet_amount),
            'payout': float(b.payout),
            'status': b.status,
            'created_at': b.created_at.isoformat(),
        }
        for b in bets
    ]
    return detail
