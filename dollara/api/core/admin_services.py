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
    Bonus,
    BonusProvider,
    Game,
    GameProvider,
    GameRound,
    GameSession,
    PlatformSetting,
    Transaction,
    User,
    UserBonus,
    UserSetting,
    Wallet,
)
from core.repositories import (
    GameRoundRepository,
    GameSessionRepository,
    invalidate_provider_cache,
)
from core import bonus_services, game_services
from core.services import get_user_settings, hash_password
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


# Per-provider aggregator credential columns. A vendor integrated on its own
# agency account (a standalone lottery provider, a second aggregator) fills
# these in; blanks fall back to the platform-wide env config.
_PROVIDER_CREDENTIAL_FIELDS = (
    'agency_uid', 'aes_secret_key', 'server_url', 'launch_path',
    'player_prefix', 'callback_path', 'currency_code',
)


def _serialize_provider(p: GameProvider) -> dict:
    return {
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'logo_url': p.logo_url,
        'is_active': p.is_active,
        'agency_uid': p.agency_uid,
        # The secret is write-only: the panel shows whether one is set, never
        # the value itself.
        'has_aes_secret_key': bool(p.aes_secret_key),
        'server_url': p.server_url,
        'launch_path': p.launch_path,
        'player_prefix': p.player_prefix,
        'callback_path': p.callback_path,
        'currency_code': p.currency_code,
        'delayed_settlement': p.delayed_settlement,
        'uses_own_account': p.has_custom_credentials,
        'game_count': getattr(p, 'games', None),
        'created_at': p.created_at.isoformat(),
    }


def list_admin_providers() -> list[dict]:
    # annotate the catalog size rather than counting per row (N+1).
    return [
        _serialize_provider(p)
        for p in GameProvider.objects.annotate(games=Count('game')).order_by('name')
    ]


def _clean_provider_payload(data: dict) -> dict:
    updates: dict = {}
    for key in ('name', 'slug', 'logo_url', *_PROVIDER_CREDENTIAL_FIELDS):
        if key in data:
            value = data[key]
            value = value.strip() if isinstance(value, str) else value
            updates[key] = value or None
    for key in ('is_active', 'delayed_settlement'):
        if key in data:
            updates[key] = bool(data[key])
    # Blanking the secret field in the form must not wipe a configured key —
    # only an explicit new value replaces it.
    if updates.get('aes_secret_key') is None:
        updates.pop('aes_secret_key', None)
    return updates


def create_provider(data: dict) -> dict:
    payload = _clean_provider_payload(data)
    if not payload.get('name') or not payload.get('slug'):
        raise ValueError('Provider name and slug are required')
    payload.setdefault('is_active', True)
    provider = GameProvider.objects.create(**payload)
    invalidate_provider_cache()
    return {'id': provider.id}


def update_provider(provider_id: int, data: dict) -> dict:
    updates = _clean_provider_payload(data)
    if updates:
        GameProvider.objects.filter(id=provider_id).update(**updates)
        # Callback decryption reads these keys from cache — refresh it now so a
        # credential change takes effect on the very next callback.
        invalidate_provider_cache()
    return {'updated': True}


def list_admin_bets(limit: int = 50, offset: int = 0, user_id: int | None = None) -> list[dict]:
    """Individual wagers across all players. These are ``GameRound`` rows — the
    real per-bet settlement events the aggregator reports (the same data the
    bet-history drill-down shows), not the legacy ``Bet`` table, which the live
    aggregator flow never populates."""
    qs = GameRound.objects.select_related('user', 'game').order_by('-created_at')
    if user_id:
        qs = qs.filter(user_id=user_id)
    rows = []
    for r in qs[offset : offset + limit]:
        net = r.win_amount - r.bet_amount
        is_pending = r.settle_status == GameRound.SettleStatus.PENDING
        rows.append({
            'id': r.id,
            'user_id': r.user_id,
            'username': r.user.username,
            'full_name': r.user.full_name,
            'game_id': r.game_id,
            # Prefer the round's denormalized name (the specific table/market
            # actually played) and fall back to the catalog game.
            'game_name': r.game_name or (r.game.name if r.game else None),
            'game_category': r.game.category if r.game else None,
            'bet_amount': float(r.bet_amount),
            'payout': float(r.win_amount),
            'profit_loss': float(net),
            # Delayed-settlement stakes read Pending until the result arrives,
            # instead of showing as a premature loss.
            'status': 'pending' if is_pending else ('won' if net >= 0 else 'lost'),
            'created_at': r.created_at.isoformat(),
        })
    return rows


# Every controllable field on a Bonus, split by how its value is coerced.
_BONUS_DECIMAL_FIELDS = (
    'value_amount', 'min_deposit', 'max_bonus_cap', 'referrer_reward',
    'wagering_multiplier', 'total_budget',
)
_BONUS_INT_FIELDS = (
    'per_user_limit', 'total_claims', 'bonus_validity_days', 'new_player_days',
    'target_user_id',
)
_BONUS_DATE_FIELDS = ('start_date', 'end_date')
_BONUS_TEXT_FIELDS = (
    'name', 'display_title', 'description', 'bonus_type', 'value_type',
    'credit_target', 'status', 'claim_method', 'scope',
)
_BONUS_BOOL_FIELDS = (
    'is_first_deposit', 'is_second_deposit', 'is_third_deposit', 'is_new_player_only',
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
        'is_first_deposit': b.is_first_deposit,
        'is_second_deposit': b.is_second_deposit,
        'is_third_deposit': b.is_third_deposit,
        'is_new_player_only': b.is_new_player_only,
        'new_player_days': b.new_player_days,
        'scope': b.scope,
        'target_user_id': b.target_user_id,
        'provider_multipliers': [
            {
                'provider_id': r.provider_id,
                'provider': r.provider.name,
                'wagering_multiplier': float(r.wagering_multiplier),
            }
            for r in b.provider_rules.select_related('provider').all()
        ],
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
    for key in _BONUS_BOOL_FIELDS:
        if key in data:
            updates[key] = bool(data[key])
    # A mass bonus must not keep a stale target pointing at one account.
    if updates.get('scope') == Bonus.Scope.MASS:
        updates['target_user_id'] = None
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
    """Manual grant: issue a bonus to a player from the panel.

    Like every other award this lands as a pending reward carrying the bonus's
    wagering requirement — it reaches the player's withdrawable balance once
    they clear it, not on grant. ``amount`` overrides the configured value (for
    one-off goodwill credits)."""
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


def set_bonus_provider_multipliers(bonus_id: int, rules: list[dict]) -> dict:
    """Replace a bonus's per-provider wagering multipliers.

    ``rules`` is [{provider_id, wagering_multiplier}, ...]. Providers left out
    fall back to the bonus's flat ``wagering_multiplier``; passing an empty list
    clears all overrides. Existing pending bonuses pick the new rates up on
    their next bet — targets are evaluated per callback, not frozen at award.
    """
    bonus = Bonus.objects.get(id=bonus_id)
    cleaned = []
    for rule in rules or []:
        provider_id = int(rule['provider_id'])
        multiplier = Decimal(str(rule['wagering_multiplier']))
        if multiplier < 0:
            raise ValueError('Wagering multiplier cannot be negative')
        if not GameProvider.objects.filter(id=provider_id).exists():
            raise ValueError(f'Unknown provider {provider_id}')
        cleaned.append((provider_id, multiplier))

    with tenant_atomic():
        keep = [pid for pid, _ in cleaned]
        BonusProvider.objects.filter(bonus_id=bonus.id).exclude(provider_id__in=keep).delete()
        for provider_id, multiplier in cleaned:
            BonusProvider.objects.update_or_create(
                bonus_id=bonus.id,
                provider_id=provider_id,
                defaults={'wagering_multiplier': multiplier},
            )
    return {'bonus_id': bonus.id, 'rules': len(cleaned)}


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
    """Forfeit an awarded bonus that has not paid out yet.

    A pending reward is not in any balance, so revoking it is a pure status
    change. Legacy 'locked' grants were credited into the bonus balance up
    front and still need the clawback. Completed grants are withdrawable money
    and are never touched."""
    with tenant_atomic():
        ub = UserBonus.objects.select_for_update().get(id=user_bonus_id)
        if ub.status not in (UserBonus.Status.PENDING, UserBonus.Status.ACTIVE):
            raise ValueError('Only bonuses that have not paid out can be revoked')
        if (
            ub.award_mode == UserBonus.AwardMode.LOCKED
            and ub.credit_target == Bonus.CreditTarget.BONUS
        ):
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


# --------------------------------------------------------------------------- #
# Manage Admin — staff accounts
# --------------------------------------------------------------------------- #

STAFF_ROLES = (User.Role.ADMIN, User.Role.SUPER_ADMIN)


def _serialize_staff(a: User) -> dict:
    return {
        'id': a.id,
        'username': a.username,
        'full_name': a.full_name,
        'email': a.email,
        'phone': a.phone,
        'role': a.role,
        'account_status': a.account_status,
        'is_active': a.account_status == User.AccountStatus.ACTIVE,
        'last_login_at': a.last_login_at.isoformat() if a.last_login_at else None,
        'created_at': a.created_at.isoformat(),
    }


def list_admin_users_list() -> list[dict]:
    return [
        _serialize_staff(a)
        for a in User.objects.filter(role__in=STAFF_ROLES).order_by('username')
    ]


def _get_staff(staff_id: int) -> User:
    staff = User.objects.filter(id=staff_id, role__in=STAFF_ROLES).first()
    if not staff:
        raise ValueError('Admin account not found')
    return staff


def create_staff(data: dict, actor_role: str) -> dict:
    """Create an admin account. Only a super admin may mint another one."""
    if actor_role != User.Role.SUPER_ADMIN:
        raise PermissionError('Only a super admin can create admin accounts')

    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    role = data.get('role') or User.Role.ADMIN
    if not username:
        raise ValueError('Username is required')
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters')
    if role not in STAFF_ROLES:
        raise ValueError('Role must be admin or super_admin')
    if User.objects.filter(username=username).exists():
        raise ValueError('That username is already taken')
    email = (data.get('email') or '').strip() or None
    if email and User.objects.filter(email=email).exists():
        raise ValueError('That email is already in use')

    staff = User.objects.create(
        username=username,
        email=email,
        full_name=(data.get('full_name') or '').strip() or None,
        role=role,
        account_status=User.AccountStatus.ACTIVE,
        password_hash=hash_password(password),
    )
    return _serialize_staff(staff)


def update_staff(staff_id: int, data: dict, actor_id: int, actor_role: str) -> dict:
    """Change an admin's role/status/details, or reset their password."""
    if actor_role != User.Role.SUPER_ADMIN:
        raise PermissionError('Only a super admin can manage admin accounts')
    staff = _get_staff(staff_id)

    if 'role' in data and data['role']:
        if data['role'] not in STAFF_ROLES:
            raise ValueError('Role must be admin or super_admin')
        # Never let the last super admin demote themselves out of the console.
        if staff.id == actor_id and data['role'] != User.Role.SUPER_ADMIN:
            raise ValueError('You cannot change your own role')
        staff.role = data['role']
    if 'account_status' in data and data['account_status']:
        if staff.id == actor_id and data['account_status'] != User.AccountStatus.ACTIVE:
            raise ValueError('You cannot deactivate your own account')
        staff.account_status = data['account_status']
    for field in ('full_name', 'email'):
        if field in data:
            setattr(staff, field, (data[field] or '').strip() or None)
    if data.get('password'):
        if len(data['password']) < 8:
            raise ValueError('Password must be at least 8 characters')
        staff.password_hash = hash_password(data['password'])

    _assert_super_admin_remains(staff)
    staff.save()
    return _serialize_staff(staff)


def delete_staff(staff_id: int, actor_id: int, actor_role: str) -> dict:
    if actor_role != User.Role.SUPER_ADMIN:
        raise PermissionError('Only a super admin can remove admin accounts')
    if staff_id == actor_id:
        raise ValueError('You cannot delete your own account')
    staff = _get_staff(staff_id)
    if staff.role == User.Role.SUPER_ADMIN and _active_super_admins().count() <= 1:
        raise ValueError('The last super admin cannot be removed')
    staff.delete()
    return {'deleted': True}


def _active_super_admins():
    return User.objects.filter(
        role=User.Role.SUPER_ADMIN, account_status=User.AccountStatus.ACTIVE
    )


def _assert_super_admin_remains(staff: User) -> None:
    """Refuse an edit that would leave the product with no active super admin."""
    demoted_or_disabled = (
        staff.role != User.Role.SUPER_ADMIN
        or staff.account_status != User.AccountStatus.ACTIVE
    )
    if demoted_or_disabled and not _active_super_admins().exclude(id=staff.id).exists():
        raise ValueError('At least one active super admin must remain')


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

    # Bet volume by category comes from the real wager rounds (GameRound), not
    # the legacy Bet table the live aggregator flow never writes to.
    category_rows = (
        GameRound.objects.values('game__category')
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


# --------------------------------------------------------------------------- #
# Bet history (admin view)
# --------------------------------------------------------------------------- #

def list_bet_history(
    limit: int = 50,
    offset: int = 0,
    user_id: int | None = None,
    status: str | None = None,
    game_uid: str | None = None,
    date_from=None,
    date_to=None,
) -> dict:
    """Every player's play sessions, with the same pending-aware result the
    player sees. Launch-only sessions are excluded — they are not bets."""
    qs = GameSessionRepository.admin_queryset(
        user_id, status, game_uid, date_from, date_to
    )
    total = qs.count()
    records = []
    for s in GameSessionRepository.page(qs, limit, offset):
        row = game_services.serialize_session(s)
        row['user_id'] = s.user_id
        row['username'] = s.user.username
        row['full_name'] = s.user.full_name
        records.append(row)

    # Summarise the SAME filtered set, so the headline figures describe the
    # rows on screen rather than the platform's all-time totals.
    totals = qs.aggregate(
        bet=Sum('total_bet'), win=Sum('total_win'), net=Sum('profit_loss')
    )
    return {
        'records': records,
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'total_bet': float(totals['bet'] or 0),
            'total_win': float(totals['win'] or 0),
            # Positive = the house is up (players' net P&L inverted).
            'gross_gaming_revenue': -float(totals['net'] or 0),
        },
    }


def get_bet_history_rounds(session_uid: str) -> dict:
    """Round-by-round drill-down for one session, for the admin panel."""
    session = GameSession.objects.select_related('game', 'user').filter(
        session_uid=session_uid
    ).first()
    if not session:
        raise ValueError('Session not found')
    rounds = GameRoundRepository.list_for_session(session.id)
    detail = game_services.serialize_session(session)
    detail['user_id'] = session.user_id
    detail['username'] = session.user.username
    return {
        'session': detail,
        'rounds': [game_services.serialize_round(r) for r in rounds],
    }


# --------------------------------------------------------------------------- #
# Report export (CSV)
# --------------------------------------------------------------------------- #

def _d(value) -> str:
    return value.isoformat() if value else ''


def _report_users(date_from, date_to):
    qs = User.objects.filter(role=User.Role.USER).select_related(
        'wallet', 'usersetting'
    ).order_by('-created_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'Username', 'Full name', 'Phone', 'Email', 'Status', 'KYC',
        'Real balance', 'Bonus balance', 'Registered', 'Last login',
    ]

    def rows():
        for u in qs.iterator():
            wallet = getattr(u, 'wallet', None)
            prefs = getattr(u, 'usersetting', None)
            yield [
                u.id, u.username, u.full_name, u.phone, u.email,
                u.account_status, prefs.kyc_status if prefs else '',
                float(wallet.main_balance) if wallet else 0,
                float(wallet.bonus_balance) if wallet else 0,
                _d(u.created_at), _d(u.last_login_at),
            ]

    return header, rows()


def _report_transactions(date_from, date_to, tx_type=None):
    qs = Transaction.objects.select_related('user').order_by('-created_at')
    if tx_type:
        qs = qs.filter(type=tx_type)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'User ID', 'Username', 'Type', 'Amount', 'Currency', 'Status',
        'Method', 'Reference', 'Notes', 'Created',
    ]

    def rows():
        for t in qs.iterator():
            yield [
                t.id, t.user_id, t.user.username, t.type, float(t.amount),
                t.currency, t.status, t.payment_method, t.reference_number,
                (t.notes or '').replace('\n', ' '), _d(t.created_at),
            ]

    return header, rows()


def _report_bet_history(date_from, date_to):
    qs = GameSession.objects.select_related('user', 'game').filter(
        Q(rounds_count__gt=0) | Q(total_bet__gt=0)
    ).order_by('-updated_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'Session', 'User ID', 'Username', 'Game', 'Category', 'Rounds',
        'Pending', 'Staked', 'Won', 'P&L', 'Result', 'Started', 'Last played',
    ]

    def rows():
        for s in qs.iterator():
            data = game_services.serialize_session(s)
            yield [
                s.session_uid, s.user_id, s.user.username, s.game_name,
                s.game.category if s.game else '', s.rounds_count,
                s.pending_rounds, float(s.total_bet), float(s.total_win),
                float(s.profit_loss), data['result'], _d(s.created_at),
                _d(s.last_played_at),
            ]

    return header, rows()


def _report_rounds(date_from, date_to):
    qs = GameRound.objects.select_related('user', 'game').order_by('-created_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'Serial', 'Round', 'User ID', 'Username', 'Game', 'Bet', 'Win',
        'P&L', 'Balance after', 'Settlement', 'Created',
    ]

    def rows():
        for r in qs.iterator():
            yield [
                r.id, r.serial_number, r.game_round, r.user_id, r.user.username,
                r.game_name or (r.game.name if r.game else ''),
                float(r.bet_amount), float(r.win_amount),
                float(r.win_amount - r.bet_amount),
                float(r.balance_after) if r.balance_after is not None else '',
                r.settle_status, _d(r.created_at),
            ]

    return header, rows()


def _report_bonuses(date_from, date_to):
    qs = UserBonus.objects.select_related('user', 'bonus').order_by('-created_at')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'User ID', 'Username', 'Bonus', 'Amount', 'Source', 'Status',
        'Wagering required', 'Wagering done', 'Created',
    ]

    def rows():
        for ub in qs.iterator():
            yield [
                ub.id, ub.user_id, ub.user.username,
                (ub.bonus.display_title or ub.bonus.name) if ub.bonus else (ub.notes or ''),
                float(ub.amount), ub.source, ub.status,
                float(ub.wagering_required), float(ub.wagering_completed),
                _d(ub.created_at),
            ]

    return header, rows()


# Report kind -> (label, builder). Each builder returns (header, row iterator)
# so exports stream instead of materialising the whole table in memory.
REPORT_KINDS = {
    'users': ('Users', lambda f, t: _report_users(f, t)),
    'transactions': ('Transactions', lambda f, t: _report_transactions(f, t)),
    'deposits': (
        'Deposits',
        lambda f, t: _report_transactions(f, t, Transaction.TxType.DEPOSIT),
    ),
    'withdrawals': (
        'Withdrawals',
        lambda f, t: _report_transactions(f, t, Transaction.TxType.WITHDRAWAL),
    ),
    'bet-history': ('Bet history', lambda f, t: _report_bet_history(f, t)),
    'rounds': ('Game rounds', lambda f, t: _report_rounds(f, t)),
    'bonuses': ('Issued bonuses', lambda f, t: _report_bonuses(f, t)),
}


def list_report_kinds() -> list[dict]:
    return [{'kind': kind, 'label': label} for kind, (label, _) in REPORT_KINDS.items()]


def build_report(kind: str, date_from=None, date_to=None):
    """Resolve a report kind to ``(header, rows)`` for CSV streaming."""
    entry = REPORT_KINDS.get(kind)
    if not entry:
        raise ValueError(f'Unknown report: {kind}')
    return entry[1](date_from, date_to)


def get_user_full_detail(user_id: int) -> dict:
    detail = get_user_detail(user_id)
    txs = Transaction.objects.filter(user_id=user_id).order_by('-created_at')[:20]
    # Recent wagers come from the real round events (GameRound), matching the
    # Bets page — the legacy Bet table is never populated by the live flow.
    bets = GameRound.objects.select_related('game').filter(user_id=user_id).order_by('-created_at')[:20]
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
            'game_name': b.game_name or (b.game.name if b.game else None),
            'bet_amount': float(b.bet_amount),
            'payout': float(b.win_amount),
            'status': (
                'pending' if b.settle_status == GameRound.SettleStatus.PENDING
                else ('won' if b.win_amount - b.bet_amount >= 0 else 'lost')
            ),
            'created_at': b.created_at.isoformat(),
        }
        for b in bets
    ]
    return detail
