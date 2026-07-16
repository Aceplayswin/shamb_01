"""Admin-only business logic for the management panel."""

import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.files.storage import default_storage
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from core.models import (
    AiCallLog,
    Banner,
    Bet,
    Bonus,
    Game,
    GameProvider,
    PlatformSetting,
    Transaction,
    User,
    UserBonus,
    UserSetting,
    Wallet,
)
from core import bonus_services
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


# Every controllable field on a Bonus, split by how its value is coerced.
_BONUS_DECIMAL_FIELDS = (
    'value_amount', 'min_deposit', 'max_bonus_cap', 'referrer_reward',
    'wagering_multiplier', 'total_budget',
)
_BONUS_INT_FIELDS = ('per_user_limit', 'total_claims', 'bonus_validity_days')
_BONUS_DATE_FIELDS = ('start_date', 'end_date')
_BONUS_TEXT_FIELDS = (
    'name', 'display_title', 'description', 'bonus_type', 'value_type',
    'credit_target', 'status', 'claim_method',
)


def _parse_dt(value):
    if not value:
        return None
    from django.utils.dateparse import parse_datetime
    dt = parse_datetime(value) if isinstance(value, str) else value
    if dt is not None and timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _normalise_promo(value):
    value = (value or '').strip().upper()
    return value or None


def _serialize_bonus(b: Bonus) -> dict:
    return {
        'id': b.id,
        'name': b.name,
        'display_title': b.display_title,
        'description': b.description,
        'bonus_type': b.bonus_type,
        'value_type': b.value_type,
        'value_amount': float(b.value_amount),
        'min_deposit': float(b.min_deposit),
        'max_bonus_cap': float(b.max_bonus_cap) if b.max_bonus_cap is not None else None,
        'referrer_reward': float(b.referrer_reward),
        'wagering_multiplier': float(b.wagering_multiplier),
        'credit_target': b.credit_target,
        'status': b.status,
        'claim_method': b.claim_method,
        'promo_code': b.promo_code,
        'per_user_limit': b.per_user_limit,
        'total_budget': float(b.total_budget) if b.total_budget is not None else None,
        'total_awarded': float(b.total_awarded),
        'total_claims': b.total_claims,
        'bonus_validity_days': b.bonus_validity_days,
        'budget_remaining': (
            float(b.total_budget - b.total_awarded) if b.total_budget is not None else None
        ),
        'start_date': b.start_date.isoformat() if b.start_date else None,
        'end_date': b.end_date.isoformat() if b.end_date else None,
        'created_at': b.created_at.isoformat(),
    }


def list_admin_bonuses() -> list[dict]:
    return [_serialize_bonus(b) for b in Bonus.objects.order_by('-created_at')]


def bonus_stats() -> dict:
    """Top-line numbers for the Bonuses page header."""
    active = Bonus.objects.filter(status=Bonus.Status.ACTIVE).count()
    awarded = Bonus.objects.aggregate(t=Sum('total_awarded'))['t'] or 0
    claims = Bonus.objects.aggregate(t=Sum('total_claims'))['t'] or 0
    return {
        'total': Bonus.objects.count(),
        'active': active,
        'total_awarded': float(awarded),
        'total_claims': int(claims),
    }


def _clean_bonus_payload(data: dict) -> dict:
    """Coerce an incoming bonus payload to typed model kwargs (create + update)."""
    updates: dict = {}
    for key in _BONUS_TEXT_FIELDS:
        if key in data:
            updates[key] = data[key] or None if key != 'name' else data[key]
    for key in _BONUS_DECIMAL_FIELDS:
        if key in data:
            updates[key] = Decimal(str(data[key])) if data[key] not in (None, '') else None
    for key in _BONUS_INT_FIELDS:
        if key in data:
            updates[key] = int(data[key]) if data[key] not in (None, '') else None
    for key in _BONUS_DATE_FIELDS:
        if key in data:
            updates[key] = _parse_dt(data[key])
    if 'promo_code' in data:
        updates['promo_code'] = _normalise_promo(data['promo_code'])
    return updates


def create_bonus(data: dict) -> dict:
    payload = _clean_bonus_payload(data)
    # Required fields with sane fallbacks so a half-filled form still succeeds.
    payload.setdefault('bonus_type', 'manual')
    payload.setdefault('value_type', 'fixed')
    payload.setdefault('value_amount', Decimal('0'))
    payload.setdefault('status', 'draft')
    if not payload.get('name'):
        raise ValueError('Internal name is required')
    bonus = Bonus.objects.create(**payload)
    return {'id': bonus.id}


def update_bonus(bonus_id: int, data: dict) -> dict:
    updates = _clean_bonus_payload(data)
    # Counters are engine-owned; never let the panel overwrite them directly.
    updates.pop('total_awarded', None)
    if updates:
        Bonus.objects.filter(id=bonus_id).update(**updates, updated_at=timezone.now())
    return {'updated': True}


def delete_bonus(bonus_id: int) -> dict:
    """Remove a bonus definition. Awarded user_bonuses keep their history
    (bonus_id is set NULL by the FK), so player ledgers stay intact."""
    Bonus.objects.filter(id=bonus_id).delete()
    return {'deleted': True}


def duplicate_bonus(bonus_id: int) -> dict:
    """Clone a bonus as a fresh draft — the fast way to spin up a variant."""
    src = Bonus.objects.get(id=bonus_id)
    src.pk = None
    src.id = None
    src.name = f'{src.name}_copy'
    src.status = Bonus.Status.DRAFT
    src.promo_code = None
    src.total_awarded = Decimal('0')
    src.total_claims = 0
    src.save()
    return {'id': src.id}


def grant_bonus_to_user(bonus_id: int, user_id: int, admin_id: int, amount=None, notes: str = '') -> dict:
    """Manual grant: push a bonus straight to a player's wallet from the panel.

    Honors the bonus's credit target + wagering. ``amount`` overrides the
    configured value (for one-off goodwill credits)."""
    bonus = Bonus.objects.get(id=bonus_id)
    if not User.objects.filter(id=user_id, role=User.Role.USER).exists():
        raise ValueError('Player account not found')
    credited = Decimal(str(amount)) if amount not in (None, '') else bonus.value_amount
    awarded = bonus_services._award_bonus(
        user_id=user_id,
        bonus=bonus,
        amount=credited,
        source=UserBonus.Source.MANUAL,
        granted_by=admin_id,
        notes=notes or f'Manual grant: {bonus.display_title or bonus.name}',
    )
    if not awarded:
        raise ValueError('Amount must be greater than zero')
    return {'granted': True, 'amount': float(awarded.amount)}


def list_issued_bonuses(bonus_id: int | None = None, limit: int = 200) -> list[dict]:
    """Awarded-bonus ledger for the panel — optionally filtered to one campaign."""
    qs = UserBonus.objects.select_related('user', 'bonus').order_by('-created_at')
    if bonus_id:
        qs = qs.filter(bonus_id=bonus_id)
    return [
        {
            'id': ub.id,
            'user_id': ub.user_id,
            'username': ub.user.username,
            'bonus': (ub.bonus.display_title or ub.bonus.name) if ub.bonus else (ub.notes or '—'),
            'amount': float(ub.amount),
            'source': ub.source,
            'status': ub.status,
            'credit_target': ub.credit_target,
            'wagering_required': float(ub.wagering_required),
            'wagering_completed': float(ub.wagering_completed),
            'created_at': ub.created_at.isoformat(),
        }
        for ub in qs[:limit]
    ]


def revoke_user_bonus(user_bonus_id: int) -> dict:
    """Forfeit an active awarded bonus and claw the locked funds back.

    Only touches still-locked bonus-balance credits; already-withdrawable (main
    balance) or completed grants are left alone."""
    with tenant_atomic():
        ub = UserBonus.objects.select_for_update().get(id=user_bonus_id)
        if ub.status != UserBonus.Status.ACTIVE:
            raise ValueError('Only active bonuses can be revoked')
        if ub.credit_target == Bonus.CreditTarget.BONUS:
            Wallet.objects.filter(user_id=ub.user_id).update(
                bonus_balance=F('bonus_balance') - ub.amount,
                wagering_balance=F('wagering_balance') - ub.wagering_required,
            )
        ub.status = UserBonus.Status.FORFEITED
        ub.save(update_fields=['status', 'updated_at'])
    return {'revoked': True}


def _serialize_banner(b: Banner) -> dict:
    return {
        'id': b.id,
        'title': b.title,
        'image_url': b.image_url,
        'link_url': b.link_url,
        'sort_order': b.sort_order,
        'status': b.status,
        'created_at': b.created_at.isoformat() if b.created_at else None,
    }


def list_admin_banners() -> list[dict]:
    return [
        _serialize_banner(b)
        for b in Banner.objects.order_by('sort_order', 'id')
    ]


def create_banner(data: dict) -> dict:
    banner = Banner.objects.create(
        title=(data.get('title') or None),
        image_url=data['image_url'],
        link_url=(data.get('link_url') or None),
        sort_order=int(data.get('sort_order', 0) or 0),
        status=data.get('status', 'draft'),
    )
    return {'id': banner.id}


def update_banner(banner_id: int, data: dict) -> dict:
    allowed = {'title', 'image_url', 'link_url', 'sort_order', 'status'}
    updates = {k: v for k, v in data.items() if k in allowed}
    # Normalize blank optional strings to NULL and coerce sort_order to int.
    for key in ('title', 'link_url'):
        if key in updates and not updates[key]:
            updates[key] = None
    if 'sort_order' in updates:
        updates['sort_order'] = int(updates['sort_order'] or 0)
    if updates:
        Banner.objects.filter(id=banner_id).update(**updates)
    return {'updated': True}


def delete_banner(banner_id: int) -> dict:
    Banner.objects.filter(id=banner_id).delete()
    return {'deleted': True}


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
