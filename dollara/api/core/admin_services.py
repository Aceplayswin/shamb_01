"""Admin-only business logic for the management panel."""

import json
import secrets
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.files.storage import default_storage
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Abs, TruncDate
from django.utils import timezone

from core.models import (
    AiCallLog,
    Banner,
    Faq,
    Bonus,
    BonusProvider,
    Game,
    GameCallbackLog,
    GameCategory,
    GameProvider,
    GameRound,
    GameSession,
    PlatformSetting,
    PromotionPoster,
    Transaction,
    User,
    UserBonus,
    UserSetting,
    Wallet,
)
from core.agent_models import SportBet
from core.backoffice_models import (
    LoginHistory,
    PaymentProvider,
)
from core.repositories import (
    GameRoundRepository,
    GameSessionRepository,
    invalidate_provider_cache,
)
from core import bonus_services, game_services
from core.data_export import fmt_when_ist
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


def _referrer_username(referrer_id: int | None) -> str | None:
    """Username behind a `referred_by` id (a plain id column, not a relation)."""
    if not referrer_id:
        return None
    return (
        User.objects.filter(id=referrer_id)
        .values_list('username', flat=True)
        .first()
    )


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
    return [_serialize_transaction(t) for t in qs[offset : offset + limit]]


def _transaction_games(transactions: list[Transaction]) -> dict:
    """Map reference_number -> game + stake/balance detail for bet settlements.

    A settlement transaction records the round's serial number as its
    reference, so the game behind a transaction can be named in reports rather
    than leaving finance to match reference ids by hand. Also carries the
    round's balance-before / stake / balance-after / result so the transaction
    modal can show the wager path, not only the net settlement amount.
    Resolved in one query for the whole page instead of per row.

    NOTE: not currently threaded through dollara's existing `_serialize_transaction`
    / `list_admin_transactions` below (those keep their original, unmodified
    signatures for this port) — added standalone per the port checklist so a
    caller can opt in explicitly (pass its result to a `games=` lookup) without
    changing their existing behaviour.
    """
    refs = [
        t.reference_number
        for t in transactions
        if t.type == Transaction.TxType.BET_SETTLEMENT and t.reference_number
    ]
    if not refs:
        return {}
    # mahakalworld also matches on `stake_serial` (the placement serial once a
    # result callback has superseded it on `serial_number`) — dollara's
    # GameRound has no such column yet, so this matches on `serial_number` only.
    # See the port report for this gap.
    rounds = GameRound.objects.select_related('game').filter(serial_number__in=refs)
    mapping = {}
    for r in rounds:
        net = r.win_amount - r.bet_amount
        is_pending = r.settle_status == GameRound.SettleStatus.PENDING
        entry = {
            'game_name': r.game_name or (r.game.name if r.game else None),
            'game_category': r.game.category if r.game else None,
            'bet_amount': float(r.bet_amount),
            'win_amount': float(r.win_amount),
            'profit_loss': float(net),
            'balance_before': (
                float(r.balance_before) if r.balance_before is not None else None
            ),
            'balance_after': (
                float(r.balance_after) if r.balance_after is not None else None
            ),
            'result': (
                'pending' if is_pending else ('won' if net >= Decimal('0') else 'lost')
            ),
        }
        if r.serial_number:
            mapping[r.serial_number] = entry
    return mapping


def _serialize_transaction(t: Transaction) -> dict:
    return {
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


def get_transaction_by_reference(reference: str) -> dict | None:
    """Look up a single transaction by its reference number — used to open the
    settlement transaction behind a bet/round from its reference id."""
    if not reference:
        return None
    t = (
        Transaction.objects.select_related('user')
        .filter(reference_number=reference)
        .order_by('-created_at')
        .first()
    )
    return _serialize_transaction(t) if t else None


def list_pending_deposits(limit: int = 100) -> list[dict]:
    return list_admin_transactions(
        tx_type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.PENDING,
        limit=limit,
    )


# --------------------------------------------------------------------------- #
# Cashier queue (new, parallel to the above) — deposit/withdrawal review tabs
# for the Backoffice Cashier section (payment methods/providers/BIN rules/
# queues). This is ADDITIVE: `list_pending_deposits` above and dollara's
# existing admin_deposits_pending / admin_withdrawals_pending endpoints and
# approve/reject flows in views.py are completely untouched. These functions
# power the *new* `admin/deposits/counts` and `admin/withdrawals/counts`
# badge endpoints and a generalised pending/approved/rejected tab view; they
# do not replace or alter any existing deposit/withdrawal logic.
# --------------------------------------------------------------------------- #

# The console groups deposits and withdrawals into three review tabs. A tab is
# not one status: a payout can sit in `processing` while it is being paid out,
# and a request that failed or was cancelled is still "not approved" as far as
# an operator reviewing rejections is concerned. Mapping the tabs here keeps the
# console and any report agreeing on what each tab contains.
CASHIER_TABS = {
    'pending': (Transaction.Status.PENDING, Transaction.Status.PROCESSING),
    'approved': (Transaction.Status.COMPLETED,),
    'rejected': (
        Transaction.Status.REJECTED,
        Transaction.Status.FAILED,
        Transaction.Status.CANCELLED,
    ),
}


def _apply_cashier_date_range(qs, date_from=None, date_to=None):
    """Restrict cashier rows to an inclusive created_at calendar range."""
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    return qs


def _cashier_type_filter(tx_type: str) -> Q:
    """Match a review-tab type plus admin adjustments moving money the same way.

    A manual wallet adjustment (see wallet_adjustment()) is stored as
    type=adjustment rather than deposit/withdrawal, but it credits or debits
    real balance just the same. Folded in here, split by the sign of the
    amount, the same way get_dashboard_stats already treats it in services.py.
    """
    if tx_type == Transaction.TxType.DEPOSIT:
        return Q(type=Transaction.TxType.DEPOSIT) | Q(
            type=Transaction.TxType.ADJUSTMENT, amount__gte=0
        )
    if tx_type == Transaction.TxType.WITHDRAWAL:
        return Q(type=Transaction.TxType.WITHDRAWAL) | Q(
            type=Transaction.TxType.ADJUSTMENT, amount__lt=0
        )
    return Q(type=tx_type)


def list_cashier_requests(
    tx_type: str,
    tab: str = 'pending',
    limit: int = 100,
    offset: int = 0,
    date_from=None,
    date_to=None,
) -> list[dict]:
    """Deposits/withdrawals for one review tab, newest first.

    Pending is ordered oldest-first instead: that tab is a work queue, and the
    request that has waited longest is the one to action next.
    """
    # "all" is the Status filter's no-filter choice: every request across the
    # three review tabs in one list.
    if tab == 'all':
        statuses = tuple(s for group in CASHIER_TABS.values() for s in group)
    else:
        statuses = CASHIER_TABS.get(tab)
    if not statuses:
        raise ValueError(f'Unknown tab "{tab}"')

    qs = Transaction.objects.select_related('user').filter(
        _cashier_type_filter(tx_type), status__in=statuses
    )
    qs = _apply_cashier_date_range(qs, date_from, date_to)
    qs = qs.order_by('created_at' if tab == 'pending' else '-created_at')
    rows = list(qs[offset : offset + limit])
    # Adjustments are stored signed (debit negative); every other row here is
    # already a plain magnitude, so abs() is a no-op for them.
    out = []
    for t in rows:
        row = _serialize_transaction(t)
        row['amount'] = abs(row['amount'])
        out.append(row)
    return out


def count_cashier_requests(tx_type: str, date_from=None, date_to=None) -> dict:
    """Tab badge counts plus amount sums for the cashier summary cards.

    Returns per-tab request counts (for the Pending/Approved/Rejected badges)
    and `sums` with the rupee total in each tab plus an overall total.
    Optional date_from/date_to limit both counts and sums to that created_at range.
    """
    qs = _apply_cashier_date_range(
        Transaction.objects.filter(_cashier_type_filter(tx_type)), date_from, date_to
    )
    by_status = {
        row['status']: row
        for row in qs.values('status').annotate(
            n=Count('id'), amount=Sum(Abs('amount'))
        )
    }

    counts = {}
    tab_amounts = {}
    for tab, statuses in CASHIER_TABS.items():
        counts[tab] = sum(by_status.get(s, {}).get('n', 0) for s in statuses)
        tab_amounts[tab] = sum(
            (by_status.get(s, {}).get('amount') or Decimal('0')) for s in statuses
        )

    sums = {tab: float(amt) for tab, amt in tab_amounts.items()}
    sums['total'] = float(sum(tab_amounts.values(), Decimal('0')))
    return {**counts, 'sums': sums}


def _serialize_category(c: GameCategory) -> dict:
    return {
        'id': c.id,
        'name': c.name,
        'slug': c.slug,
        'icon_url': c.icon_url,
        'is_sports': c.is_sports,
        'is_delayed_settlement': c.is_delayed_settlement,
        'is_active': c.is_active,
        'sort_order': c.sort_order,
        'game_count': getattr(c, 'games_count', None),
        'created_at': c.created_at.isoformat() if c.created_at else None,
    }


def list_admin_categories() -> list[dict]:
    # Annotate the catalog size instead of counting per row (N+1).
    return [
        _serialize_category(c)
        for c in GameCategory.objects.annotate(games_count=Count('games')).order_by(
            'sort_order', 'name'
        )
    ]


def _clean_category_payload(data: dict) -> dict:
    updates: dict = {}
    for key in ('name', 'slug', 'icon_url'):
        if key in data:
            value = data[key]
            value = value.strip() if isinstance(value, str) else value
            updates[key] = value or None
    for key in ('is_sports', 'is_delayed_settlement', 'is_active'):
        if key in data:
            updates[key] = bool(data[key])
    if 'sort_order' in data:
        updates['sort_order'] = int(data['sort_order'] or 0)
    return updates


def create_category(data: dict) -> dict:
    payload = _clean_category_payload(data)
    if not payload.get('name') or not payload.get('slug'):
        raise ValueError('Category name and slug are required')
    slug = payload['slug']
    if GameCategory.objects.filter(slug=slug).exists():
        raise ValueError(f'A category with slug "{slug}" already exists')
    payload.setdefault('is_active', True)
    category = GameCategory.objects.create(**payload)
    return {'id': category.id}


def update_category(category_id: int, data: dict) -> dict:
    updates = _clean_category_payload(data)
    if not updates:
        return {'updated': True}
    category = GameCategory.objects.filter(id=category_id).first()
    if category is None:
        raise ValueError('Category not found')
    new_slug = updates.get('slug')
    if new_slug and new_slug != category.slug:
        if GameCategory.objects.filter(slug=new_slug).exclude(id=category_id).exists():
            raise ValueError(f'A category with slug "{new_slug}" already exists')
    with tenant_atomic():
        GameCategory.objects.filter(id=category_id).update(**updates)
        # `games.category` mirrors the slug for reports/exports that read it
        # directly, so a rename has to carry through in the same transaction.
        if new_slug and new_slug != category.slug:
            Game.objects.filter(category_ref_id=category_id).update(category=new_slug)
    return {'updated': True}


def delete_category(category_id: int) -> dict:
    """Remove a category. Refused while games still reference it, so a delete
    can never silently strip the vertical off a live catalog row."""
    category = GameCategory.objects.filter(id=category_id).first()
    if category is None:
        raise ValueError('Category not found')
    in_use = Game.objects.filter(category_ref_id=category_id).count()
    if in_use:
        raise ValueError(
            f'{in_use} game(s) still use this category — reassign them first'
        )
    category.delete()
    return {'deleted': True}


def _resolve_category(data: dict) -> dict:
    """Map an incoming `category` slug and/or `category_id` onto both columns.

    The panel may send either; whichever arrives, both the FK and the mirrored
    slug are written together so they can never drift apart.

    NOTE: not currently called from create_game/update_game below (dollara's
    versions keep their existing flat-`category`-only signature for this
    port) — added standalone per the port checklist. Wiring it in would let
    the game-admin form set a game's category_ref alongside the legacy slug.
    """
    raw_id = data.get('category_id')
    slug = data.get('category')
    category = None
    if raw_id not in (None, ''):
        category = GameCategory.objects.filter(id=int(raw_id)).first()
        if category is None:
            raise ValueError('Unknown category')
    elif slug:
        category = GameCategory.objects.filter(slug=slug).first()
        if category is None:
            raise ValueError(f'Unknown category "{slug}"')
    if category is None:
        return {}
    return {'category_ref_id': category.id, 'category': category.slug}


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
    qs = GameRound.objects.select_related(
        'user', 'game', 'session', 'session__game'
    ).order_by('-created_at')
    if user_id:
        qs = qs.filter(user_id=user_id)
    rows = []
    for r in qs[offset : offset + limit]:
        net = r.win_amount - r.bet_amount
        is_pending = r.settle_status == GameRound.SettleStatus.PENDING
        # For lobby games the settlement callback reports the inner game's uid,
        # which isn't a catalog entry, so the round's own game FK is empty. Fall
        # back to the game the player actually launched (the session's catalog
        # game) so name and category still resolve.
        session_game = r.session.game if r.session_id else None
        game_name = (
            r.game_name
            or (r.game.name if r.game else None)
            or (session_game.name if session_game else None)
        )
        game_category = (
            (r.game.category if r.game else None)
            or (session_game.category if session_game else None)
        )
        rows.append({
            'id': r.id,
            'user_id': r.user_id,
            'username': r.user.username,
            'full_name': r.user.full_name,
            'game_id': r.game_id,
            'game_name': game_name,
            'game_category': game_category,
            # The round's unique id — this is what the bet-settlement transaction
            # stores as its reference_number, so the panel can open that record.
            'reference': r.serial_number,
            'bet_amount': float(r.bet_amount),
            'payout': float(r.win_amount),
            'profit_loss': float(net),
            # Wallet balance recorded right after this round settled — the total
            # the player had available at that point, so money can be tracked.
            'wallet_balance': float(r.balance_after) if r.balance_after is not None else None,
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


def _resolve_player_id(member_or_id) -> int:
    """Resolve an admin-facing Member ID (username) or internal pk to a player id.

    The Users panel shows ``username`` as Member ID (e.g. 10000011). Admins paste
    that into grant forms; looking up only by pk would miss them. Prefer username,
    then fall back to the numeric primary key.
    """
    raw = str(member_or_id).strip()
    if not raw:
        raise ValueError('Player account not found')
    player = User.objects.filter(username=raw, role=User.Role.USER).only('id').first()
    if player:
        return player.id
    try:
        uid = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError('Player account not found') from exc
    if User.objects.filter(id=uid, role=User.Role.USER).exists():
        return uid
    raise ValueError('Player account not found')


def grant_bonus_to_user(bonus_id: int, user_id, admin_id: int, amount=None, notes: str = '') -> dict:
    """Manual grant: issue a bonus to a player from the panel.

    Like every other award this lands as a pending reward carrying the bonus's
    wagering requirement — it reaches the player's withdrawable balance once
    they clear it, not on grant. ``amount`` overrides the configured value (for
    one-off goodwill credits). ``user_id`` accepts Member ID (username) or pk.
    """
    bonus = Bonus.objects.get(id=bonus_id)
    resolved_user_id = _resolve_player_id(user_id)
    credited = Decimal(str(amount)) if amount not in (None, '') else bonus.value_amount
    awarded = bonus_services._award_bonus(
        user_id=resolved_user_id,
        bonus=bonus,
        amount=credited,
        source=UserBonus.Source.MANUAL,
        granted_by=admin_id,
        notes=notes or f'Manual grant: {bonus.display_title or bonus.name}',
    )
    if not awarded:
        raise ValueError('Amount must be greater than zero')
    return {'granted': True, 'amount': float(awarded.amount), 'user_id': resolved_user_id}


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


def generate_coupon_code(length: int = 8, prefix: str = '') -> dict:
    """Mint an unused coupon code for the Add/Edit bonus form.

    Uses an unambiguous alphabet (no O/0, I/1) so a code read off a banner or
    told over the phone cannot be mistyped. Uniqueness is checked against
    existing campaigns, and the column carries a UNIQUE key as the real guard.
    """
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    prefix = (prefix or '').strip().upper()
    length = max(4, min(int(length or 8), 20))
    for _ in range(20):
        code = prefix + ''.join(secrets.choice(alphabet) for _ in range(length))
        if not Bonus.objects.filter(promo_code=code).exists():
            return {'code': code}
    raise ValueError('Could not generate a free coupon code, try again')


def list_coupon_redemptions(bonus_id: int | None = None, limit: int = 200) -> list[dict]:
    """Who redeemed a coupon code, when, and for how much.

    Drives the Bonuses page "Coupon redemptions" tab. Scoped to promo-sourced
    awards so manual grants and automatic joining bonuses stay out of it.
    """
    qs = (
        UserBonus.objects.filter(source=UserBonus.Source.PROMO)
        .select_related('user', 'bonus')
        .order_by('-created_at')
    )
    if bonus_id:
        qs = qs.filter(bonus_id=bonus_id)
    return [
        {
            'id': ub.id,
            'user_id': ub.user_id,
            'username': ub.user.username,
            'bonus': (ub.bonus.display_title or ub.bonus.name) if ub.bonus else '—',
            'code': ub.bonus.promo_code if ub.bonus else None,
            'amount': float(ub.amount),
            'status': ub.status,
            'wagering_required': float(ub.wagering_required),
            'wagering_completed': float(ub.wagering_completed),
            'redeemed_at': ub.created_at.isoformat(),
        }
        for ub in qs[:limit]
    ]


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


def _serialize_promotion_poster(p: PromotionPoster) -> dict:
    return {
        'id': p.id,
        'title': p.title,
        'image_url': p.image_url,
        'link_url': p.link_url,
        'sort_order': p.sort_order,
        'status': p.status,
        'created_at': p.created_at.isoformat() if p.created_at else None,
    }


def list_admin_promotion_posters() -> list[dict]:
    return [
        _serialize_promotion_poster(p)
        for p in PromotionPoster.objects.order_by('sort_order', 'id')
    ]


def create_promotion_poster(data: dict) -> dict:
    poster = PromotionPoster.objects.create(
        title=(data.get('title') or None),
        image_url=data['image_url'],
        link_url=(data.get('link_url') or None),
        sort_order=int(data.get('sort_order', 0) or 0),
        status=data.get('status', 'draft'),
    )
    return {'id': poster.id}


def update_promotion_poster(poster_id: int, data: dict) -> dict:
    allowed = {'title', 'image_url', 'link_url', 'sort_order', 'status'}
    updates = {k: v for k, v in data.items() if k in allowed}
    for key in ('title', 'link_url'):
        if key in updates and not updates[key]:
            updates[key] = None
    if 'sort_order' in updates:
        updates['sort_order'] = int(updates['sort_order'] or 0)
    if updates:
        PromotionPoster.objects.filter(id=poster_id).update(**updates)
    return {'updated': True}


def delete_promotion_poster(poster_id: int) -> dict:
    PromotionPoster.objects.filter(id=poster_id).delete()
    return {'deleted': True}


def _serialize_faq(f: Faq) -> dict:
    return {
        'id': f.id,
        'question': f.question,
        'answer': f.answer,
        'sort_order': f.sort_order,
        'status': f.status,
        'created_at': f.created_at.isoformat() if f.created_at else None,
    }


def list_admin_faqs() -> list[dict]:
    return [
        _serialize_faq(f)
        for f in Faq.objects.order_by('sort_order', 'id')
    ]


def create_faq(data: dict) -> dict:
    question = (data.get('question') or '').strip()
    answer = (data.get('answer') or '').strip()
    if not question:
        raise ValueError('Question is required')
    if not answer:
        raise ValueError('Answer is required')
    faq = Faq.objects.create(
        question=question,
        answer=answer,
        sort_order=int(data.get('sort_order', 0) or 0),
        status=data.get('status', 'active'),
    )
    return {'id': faq.id}


def update_faq(faq_id: int, data: dict) -> dict:
    allowed = {'question', 'answer', 'sort_order', 'status'}
    updates = {k: v for k, v in data.items() if k in allowed}
    for key in ('question', 'answer'):
        if key in updates:
            value = (updates[key] or '').strip()
            if not value:
                raise ValueError(f'{key.capitalize()} cannot be empty')
            updates[key] = value
    if 'sort_order' in updates:
        updates['sort_order'] = int(updates['sort_order'] or 0)
    if updates:
        Faq.objects.filter(id=faq_id).update(**updates)
    return {'updated': True}


def delete_faq(faq_id: int) -> dict:
    Faq.objects.filter(id=faq_id).delete()
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
        for a in User.objects.filter(role=User.Role.ADMIN).order_by('username')
    ]


def _get_staff(staff_id: int) -> User:
    staff = User.objects.filter(id=staff_id, role=User.Role.ADMIN).first()
    if not staff:
        raise ValueError('Admin account not found')
    return staff


def _check_role(role: str | None) -> None:
    """A product has one kind of console account, so 'admin' is the only role."""
    if role and role != User.Role.ADMIN:
        raise ValueError('Role must be admin')


def create_staff(data: dict) -> dict:
    """Create an admin account. Every admin can manage the console accounts."""
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username:
        raise ValueError('Username is required')
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters')
    _check_role(data.get('role'))
    if User.objects.filter(username=username).exists():
        raise ValueError('That username is already taken')
    email = (data.get('email') or '').strip() or None
    if email and User.objects.filter(email=email).exists():
        raise ValueError('That email is already in use')

    staff = User.objects.create(
        username=username,
        email=email,
        full_name=(data.get('full_name') or '').strip() or None,
        role=User.Role.ADMIN,
        account_status=User.AccountStatus.ACTIVE,
        password_hash=hash_password(password),
    )
    return _serialize_staff(staff)


def update_staff(staff_id: int, data: dict, actor_id: int) -> dict:
    """Change an admin's status/details, or reset their password."""
    staff = _get_staff(staff_id)

    _check_role(data.get('role'))
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

    _assert_admin_remains(staff)
    staff.save()
    return _serialize_staff(staff)


def delete_staff(staff_id: int, actor_id: int) -> dict:
    if staff_id == actor_id:
        raise ValueError('You cannot delete your own account')
    staff = _get_staff(staff_id)
    if _active_admins().count() <= 1:
        raise ValueError('The last admin cannot be removed')
    staff.delete()
    return {'deleted': True}


def _active_admins():
    return User.objects.filter(
        role=User.Role.ADMIN, account_status=User.AccountStatus.ACTIVE
    )


def _assert_admin_remains(staff: User) -> None:
    """Refuse an edit that would leave the product with no active admin."""
    if staff.account_status != User.AccountStatus.ACTIVE and (
        not _active_admins().exclude(id=staff.id).exists()
    ):
        raise ValueError('At least one active admin must remain')


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


def _pair_legacy_split_rounds(rounds: list[dict]) -> list[dict]:
    """Fold a legacy stake row and its payout row into one wager.

    Settlement now merges a payout onto the stake it belongs to, so one wager is
    one row (see ``game_services._settle``). Rounds recorded before that landed
    are still stored as a pair sharing one ``game_round``: the stake
    (bet N / win 0, shown as a loss) and, seconds later, the payout
    (bet 0 / win M, shown as a pure win). Displayed as-is they read as two
    separate bets, neither showing what the wager actually did.

    Pairing them here keeps the fix to presentation — the stored rows are left
    untouched — and yields the same shape settlement produces today: the stake's
    amount and opening balance, the payout's closing balance and timestamp, and
    the real net. A stake with no payout (a plain loss) and a payout with no
    stake are both passed through unchanged.

    NOTE: not currently called from get_bet_history_rounds below (dollara's
    version keeps its existing, unmodified output for this port) — added
    standalone per the port checklist.
    """
    by_round: dict[str, list[dict]] = {}
    for r in rounds:
        if r.get('game_round'):
            by_round.setdefault(r['game_round'], []).append(r)

    merged_ids: set = set()
    paired: dict[int, dict] = {}
    for group in by_round.values():
        if len(group) < 2:
            continue
        # Oldest first, so a stake is matched with the payout that followed it.
        ordered = sorted(group, key=lambda r: (r['created_at'], r['id']))
        stakes = [r for r in ordered if r['bet_amount'] > 0 and r['win_amount'] <= 0]
        payouts = [r for r in ordered if r['bet_amount'] <= 0 and r['win_amount'] > 0]
        for stake, payout in zip(stakes, payouts):
            combined = {
                **stake,
                'win_amount': payout['win_amount'],
                'profit_loss': payout['win_amount'] - stake['bet_amount'],
                # End state of the whole wager: where the payout left the wallet.
                'balance_after': payout['balance_after'],
                'settled_at': payout['settled_at'] or stake['settled_at'],
                'settle_status': payout['settle_status'],
                'result': (
                    'won'
                    if payout['win_amount'] - stake['bet_amount'] >= 0
                    else 'lost'
                ),
            }
            paired[stake['id']] = combined
            merged_ids.add(payout['id'])

    return [
        paired.get(r['id'], r) for r in rounds if r['id'] not in merged_ids
    ]


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


def _d_ist(value) -> str:
    """IST-rendered timestamp for reports (mirrors ``_d``, in local time)."""
    return fmt_when_ist(value) if value else ''


def resolve_player_ids(term: str) -> list[int]:
    """Resolve a free-text search term to the player ids it identifies.

    The reports filter used to match `username` exactly, so anything else an
    operator had to hand — a numeric id, a phone number — silently
    exported nothing. This accepts any of them:

      * the numeric player id
      * username (exact first, then partial)
      * phone (partial)
      * full name (partial)

    An exact id, username or phone wins on its own so a precise search
    never drags in look-alikes; only when nothing matches exactly does it fall
    back to a partial sweep. Returns [] when the term matches nobody, which
    callers must treat as "no rows" rather than "no filter".
    """
    term = (term or '').strip()
    if not term:
        return []

    players = User.objects.filter(role=User.Role.USER)

    # Exact identifiers first — these are unambiguous by definition.
    exact = Q(username=term) | Q(phone=term)
    if term.isdigit():
        exact |= Q(id=int(term))
    ids = list(players.filter(exact).values_list('id', flat=True))
    if ids:
        return ids

    # Nothing matched exactly, so widen to a partial sweep.
    partial = (
        Q(username__icontains=term)
        | Q(phone__icontains=term)
        | Q(full_name__icontains=term)
    )
    return list(players.filter(partial).values_list('id', flat=True))


def _apply_member_filter(qs, member_id, field='user_id'):
    """Narrow `qs` to the players `member_id` identifies.

    A term that matches nobody filters everything out — exporting the whole
    table because a search found nothing would be worse than an empty file.

    NOTE: dollara's existing _report_users/_report_transactions/etc below keep
    their original simple `username=member_id` exact-match filtering for this
    port — this helper (and the richer resolve_player_ids lookup) is added
    standalone and used by the new _report_casino/_report_sports below.
    """
    if not member_id:
        return qs
    ids = resolve_player_ids(member_id)
    return qs.filter(**{f'{field}__in': ids})


class _PlayerIpLookup:
    """Most recent known IP per player, resolved lazily and memoised per export.

    Only sign-up and sign-in capture an address (``users.signup_ip`` and
    ``login_history``); money and play rows carry none of their own. So the
    IP column on every report is the player's latest login IP, falling back
    to the sign-up IP for a player who has not signed in since tracking
    began. One query per distinct player rather than per row keeps this cheap
    on the large round exports.
    """

    def __init__(self):
        self._cache: dict = {}

    def __call__(self, user_id, signup_ip=None) -> str:
        if user_id is None:
            return ''
        if user_id not in self._cache:
            self._cache[user_id] = (
                LoginHistory.objects.filter(user_id=user_id)
                .exclude(ip_address__isnull=True)
                .exclude(ip_address='')
                .order_by('-created_at')
                .values_list('ip_address', flat=True)
                .first()
            ) or ''
        return self._cache[user_id] or (signup_ip or '')


def _sports_category_slugs() -> frozenset:
    """Admin-managed sports verticals (GameCategory.is_sports), for splitting
    casino vs sports report rows.

    mahakalworld reads this off a cached ``sports_category_slugs()`` helper in
    core/repositories.py; dollara's repositories.py has no such cache/
    invalidation plumbing (out of scope for this port — repositories.py is not
    one of the files being touched), so this is a local, uncached equivalent.
    A plain query is cheap enough for report generation, which is not a hot
    path. Falls back to the historical enum members if no category has been
    flagged yet.
    """
    try:
        slugs = frozenset(
            GameCategory.objects.filter(is_sports=True).values_list('slug', flat=True)
        )
    except Exception:
        slugs = frozenset()
    return slugs or frozenset({Game.Category.SPORTS, Game.Category.VIRTUAL_SPORTS})


def _report_users(date_from, date_to, member_id=None):
    qs = User.objects.filter(role=User.Role.USER).select_related(
        'wallet', 'usersetting'
    ).order_by('-created_at')
    if member_id:
        qs = qs.filter(username=member_id)
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


def _report_transactions(date_from, date_to, tx_type=None, member_id=None):
    qs = Transaction.objects.select_related('user').order_by('-created_at')
    if tx_type:
        qs = qs.filter(type=tx_type)
    if member_id:
        qs = qs.filter(user__username=member_id)
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


def _report_bet_history(date_from, date_to, member_id=None):
    qs = GameSession.objects.select_related('user', 'game').filter(
        Q(rounds_count__gt=0) | Q(total_bet__gt=0)
    ).order_by('-updated_at')
    if member_id:
        qs = qs.filter(user__username=member_id)
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


def _report_rounds(date_from, date_to, member_id=None):
    qs = GameRound.objects.select_related('user', 'game').order_by('-created_at')
    if member_id:
        qs = qs.filter(user__username=member_id)
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


def _report_bonuses(date_from, date_to, member_id=None):
    qs = UserBonus.objects.select_related('user', 'bonus').order_by('-created_at')
    if member_id:
        qs = qs.filter(user__username=member_id)
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


def _report_casino(date_from, date_to, member_id=None):
    """Casino rounds only — every vertical except the sports ones.

    The sports/casino split is admin-managed data (``game_categories.is_sports``),
    so it is read through the same helper the settlement path uses rather than
    hardcoded here. Uses the richer ``_apply_member_filter``/``resolve_player_ids``
    lookup (id / username / phone / full name) rather than dollara's existing
    reports' plain ``username=member_id`` match.
    """
    qs = GameRound.objects.select_related('user', 'game').exclude(
        game__category__in=_sports_category_slugs()
    ).order_by('-created_at')
    qs = _apply_member_filter(qs, member_id)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'Round', 'User ID', 'Username', 'IP address', 'Game', 'Category',
        'Provider', 'Bet', 'Win', 'P&L', 'Currency', 'Settlement', 'Created',
        'Created (ITZ)',
    ]
    ip_for = _PlayerIpLookup()

    def rows():
        for r in qs.iterator():
            game = r.game
            provider = getattr(game, 'provider', None) if game else None
            yield [
                r.id, r.game_round, r.user_id, r.user.username,
                ip_for(r.user_id, r.user.signup_ip),
                r.game_name or (game.name if game else ''),
                game.category if game else '',
                provider.name if provider else '',
                float(r.bet_amount), float(r.win_amount),
                float(r.win_amount - r.bet_amount),
                r.currency, r.settle_status,
                _d(r.created_at), _d_ist(r.created_at),
            ]

    return header, rows()


def _report_sports(date_from, date_to, member_id=None):
    """Sportsbook stakes, one row per bet, with its event and market resolved.

    ``SportBet.profit_loss`` is stored signed from the house's side; the column
    here is the player's result, so it carries the negated value — matching how
    the player profile reports the same number.
    """
    qs = SportBet.objects.select_related('user', 'event', 'market').order_by(
        '-created_at'
    )
    qs = _apply_member_filter(qs, member_id)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    header = [
        'ID', 'User ID', 'Username', 'IP address', 'Sport', 'Competition',
        'Event', 'Market', 'Market type', 'Selection', 'Side', 'Odds', 'Stake',
        'Liability', 'Exposure', 'Player P&L', 'Commission', 'Status', 'Placed',
        'Placed (ITZ)', 'Settled', 'Settled (ITZ)',
    ]
    ip_for = _PlayerIpLookup()

    def rows():
        for b in qs.iterator():
            event = b.event if b.event_id else None
            market = b.market if b.market_id else None
            yield [
                b.id, b.user_id, b.user.username,
                ip_for(b.user_id, b.user.signup_ip),
                event.sport if event else '',
                (event.competition or '') if event else '',
                event.name if event else '',
                market.name if market else '',
                market.market_type if market else '',
                b.selection_name or '', b.side, float(b.odds), float(b.stake),
                float(b.liability), float(b.exposure),
                -float(b.profit_loss), float(b.commission),
                b.status, _d(b.placed_at), _d_ist(b.placed_at),
                _d(b.settled_at), _d_ist(b.settled_at),
            ]

    return header, rows()


# Report kind -> (label, builder). Each builder returns (header, row iterator)
# so exports stream instead of materialising the whole table in memory.
REPORT_KINDS = {
    'users': ('Users', lambda f, t, m: _report_users(f, t, m)),
    'transactions': ('Transactions', lambda f, t, m: _report_transactions(f, t, member_id=m)),
    'deposits': (
        'Deposits',
        lambda f, t, m: _report_transactions(f, t, Transaction.TxType.DEPOSIT, m),
    ),
    'withdrawals': (
        'Withdrawals',
        lambda f, t, m: _report_transactions(f, t, Transaction.TxType.WITHDRAWAL, m),
    ),
    'bet-history': ('Bet history', lambda f, t, m: _report_bet_history(f, t, m)),
    'rounds': ('Game rounds', lambda f, t, m: _report_rounds(f, t, m)),
    'casino': ('Casino', lambda f, t, m: _report_casino(f, t, m)),
    'sports': ('Sports', lambda f, t, m: _report_sports(f, t, m)),
    'bonuses': ('Issued bonuses', lambda f, t, m: _report_bonuses(f, t, m)),
}


def list_report_kinds() -> list[dict]:
    return [{'kind': kind, 'label': label} for kind, (label, _) in REPORT_KINDS.items()]


def build_report(kind: str, date_from=None, date_to=None, member_id=None):
    """Resolve a report kind to ``(header, rows)`` for CSV streaming."""
    entry = REPORT_KINDS.get(kind)
    if not entry:
        raise ValueError(f'Unknown report: {kind}')
    return entry[1](date_from, date_to, member_id)


def _is_aura_gaming(provider_name, provider_slug, game_type) -> bool:
    """Aura catalog rows may sit under the Aura provider or still carry
    ``game_type='Aura Gaming'`` while the FK points at a generic vertical."""
    if provider_slug == 'aura-gaming':
        return True
    if (provider_name or '').strip().lower() == 'aura gaming':
        return True
    return (game_type or '').strip().lower() == 'aura gaming'


def _game_statistics(user_id: int) -> tuple[list[dict], list[dict]]:
    """Per-game rollups since forever, split the way the reference splits them:
    real-money rounds carry stake/win, for-fun sessions only count launches.

    "For fun" here is a session that never produced a settled round — the
    platform has no demo-mode flag on GameSession, so a launch with no wager
    is the only thing that distinguishes the two.

    ``amount`` is what the provider paid back (for Aura Gaming that is the
    final return value). ``result`` is the player's net: amount − bet, so a
    bet of 300 with amount 200 is result −100.

    NOTE: not currently called from get_user_full_detail below (dollara's
    version keeps its existing, simpler payload for this port) — added
    standalone per the port checklist, along with the other player-profile
    enrichment helpers below it (_received_bonuses, _cashier_rows,
    _sport_bet_rows, _player_financials). See the port report.
    """
    real_rows = (
        GameRound.objects.filter(user_id=user_id)
        .values(
            'game_id',
            'game_uid',
            'game_name',
            'game__provider__name',
            'game__provider__slug',
            'game__game_type',
        )
        .annotate(
            plays=Count('id'),
            bet=Sum('bet_amount'),
            amount=Sum('win_amount'),
        )
        .order_by('-plays')
    )
    real = []
    for r in real_rows:
        bet = float(r['bet'] or 0)
        amount = float(r['amount'] or 0)
        provider = r['game__provider__name']
        if _is_aura_gaming(provider, r['game__provider__slug'], r['game__game_type']):
            if (provider or '').strip().lower() != 'aura gaming':
                provider = 'Aura Gaming'
        real.append(
            {
                'game_id': r['game_id'] or r['game_uid'],
                'game_name': r['game_name'],
                'provider': provider,
                'plays': r['plays'],
                'bet': bet,
                'amount': amount,
                'result': amount - bet,
            }
        )

    fun_rows = (
        GameSession.objects.filter(user_id=user_id, rounds_count=0)
        .values('game_id', 'game_uid', 'game_name')
        .annotate(launches=Count('id'))
        .order_by('-launches')
    )
    fun = [
        {
            'game_id': r['game_id'] or r['game_uid'],
            'game_name': r['game_name'],
            'launches': r['launches'],
        }
        for r in fun_rows
    ]
    return real, fun


def _received_bonuses(user_id: int) -> list[dict]:
    rows = (
        UserBonus.objects.select_related('bonus')
        .filter(user_id=user_id)
        .order_by('-created_at')[:50]
    )
    return [
        {
            'id': b.id,
            'requested_at': b.created_at.isoformat(),
            'expires_at': b.expires_at.isoformat() if b.expires_at else None,
            'bonus_code': b.bonus.promo_code if b.bonus else None,
            'bonus_name': b.bonus.name if b.bonus else None,
            'amount': float(b.amount),
            # A pending-mode award is auto-credited once wagering clears; a
            # legacy locked one was credited up front.
            'auto_redeem': b.award_mode == UserBonus.AwardMode.PENDING,
            'charged': float(b.wagering_completed),
            'state': b.status,
            'comments': b.notes,
            'given_by': b.granted_by,
        }
        for b in rows
    ]


def _tx_playable_delta(t: Transaction) -> Decimal | None:
    """Signed change this ledger row made to the player's playable wallet.

    Returns ``None`` when the row did not move playable balance (pending
    deposits, rejected withdrawals after the hold was released, etc.). Used to
    reconstruct the post-transaction wallet total for the profile history.
    """
    amount = Decimal(t.amount)
    if t.type == Transaction.TxType.DEPOSIT:
        if t.status != Transaction.Status.COMPLETED:
            return None
        return amount
    if t.type == Transaction.TxType.WITHDRAWAL:
        # Playable drops when the hold is placed and stays down through
        # approval. A rejection releases the hold, so the row nets to zero.
        if t.status in (
            Transaction.Status.PENDING,
            Transaction.Status.PROCESSING,
            Transaction.Status.COMPLETED,
        ):
            return -abs(amount)
        return None
    if t.type == Transaction.TxType.ADJUSTMENT:
        if t.status != Transaction.Status.COMPLETED:
            return None
        # Adjustments are stored signed (credit positive, debit negative).
        return amount
    if t.type == Transaction.TxType.BONUS_CREDIT:
        if t.status != Transaction.Status.COMPLETED:
            return None
        return abs(amount)
    if t.type == Transaction.TxType.REFUND:
        if t.status != Transaction.Status.COMPLETED:
            return None
        return abs(amount)
    if t.type == Transaction.TxType.BET_SETTLEMENT:
        if t.status != Transaction.Status.COMPLETED:
            return None
        # Amount is abs(net); direction lives in the notes ('Win' / 'Loss').
        notes = (t.notes or '').strip().lower()
        if notes.startswith('win'):
            return abs(amount)
        if notes.startswith('loss'):
            return -abs(amount)
        return None
    return None


def _wallet_playable(wallet: Wallet | None) -> Decimal:
    """What the player can actually stake: real money plus bonus credit.

    Local equivalent of mahakalworld's ``WalletRepository.playable`` —
    dollara's core/repositories.py (not touched by this port) has no such
    method, so it is inlined here for ``_cashier_rows`` below.
    """
    if wallet is None:
        return Decimal('0')
    playable = wallet.main_balance + wallet.bonus_balance - wallet.locked_balance
    return playable if playable > 0 else Decimal('0')


def _cashier_rows(user_id: int) -> tuple[list[dict], list[dict], list[dict]]:
    """Deposits, withdrawals and the full transaction ledger for the profile.

    All three read the same Transaction table, so they are built in one pass
    rather than three queries over the same rows.
    """
    txs = list(
        Transaction.objects.filter(user_id=user_id).order_by('-created_at')[:200]
    )
    provider_names = _payment_provider_names(
        {t.provider_id for t in txs if t.provider_id}
    )
    game_info = _round_game_info({t.reference_number for t in txs if t.reference_number})

    # Walk newest → oldest from the current playable balance so each history
    # row can show the wallet total available after that credit/debit. Known
    # GameRound.balance_after values re-anchor the walk when present.
    running = _wallet_playable(Wallet.objects.filter(user_id=user_id).first())
    wallet_after: dict[int, float | None] = {}
    for t in txs:
        # Only bet settlements are keyed to a GameRound serial; other types may
        # reuse reference_number for payment refs and must not pick up a round.
        round_after = None
        if t.type == Transaction.TxType.BET_SETTLEMENT:
            round_after = game_info.get(t.reference_number, {}).get('balance_after')
        delta = _tx_playable_delta(t)
        if round_after is not None:
            wallet_after[t.id] = float(round_after)
            running = Decimal(str(round_after))
            if delta is not None:
                running -= delta
        elif delta is not None:
            wallet_after[t.id] = float(running)
            running -= delta
        else:
            wallet_after[t.id] = float(running)

    deposits, withdrawals, history = [], [], []
    for t in txs:
        history.append(
            {
                'id': t.id,
                'round_id': t.reference_number,
                'provider': game_info.get(t.reference_number, {}).get('provider'),
                'game_name': game_info.get(t.reference_number, {}).get('game_name'),
                'created_at': t.created_at.isoformat(),
                'description': t.notes,
                'type': t.type,
                'amount': float(t.amount),
                # Playable wallet balance after this credit/debit — not the
                # movement size (that is ``amount``).
                'wallet_balance': wallet_after.get(t.id),
                'status': t.status,
                'currency': t.currency,
            }
        )
        # Money-in and money-out are not just deposit/withdrawal rows: an admin
        # adjustment or a refund moves real balance too, so the cashier tables
        # list them alongside, split by the sign of the amount (credit -> the
        # Deposits table, debit -> Withdraws). Every status is included —
        # pending, rejected and failed rows matter to whoever reads the profile.
        amount = float(t.amount)
        if t.type == Transaction.TxType.DEPOSIT:
            money_in = True
        elif t.type == Transaction.TxType.WITHDRAWAL:
            money_in = False
        elif t.type in (Transaction.TxType.ADJUSTMENT, Transaction.TxType.REFUND):
            money_in = amount >= 0
        else:
            # bonus_credit / bet_settlement are gameplay ledger rows; they stay
            # in the transaction history only.
            continue

        if money_in:
            deposits.append(
                {
                    'id': t.id,
                    'updated_at': t.updated_at.isoformat(),
                    'created_at': t.created_at.isoformat(),
                    'type': t.type,
                    'payment_method': t.payment_method,
                    'provider_id': t.provider_id,
                    'provider_name': provider_names.get(t.provider_id),
                    'provider_payment_id': t.provider_payment_id,
                    'description': t.notes,
                    'amount': amount,
                    'status': t.status,
                    'currency': t.currency,
                    'error_message': t.error_message,
                }
            )
        else:
            withdrawals.append(
                {
                    'id': t.id,
                    'updated_at': t.updated_at.isoformat(),
                    'created_at': t.created_at.isoformat(),
                    'type': t.type,
                    'payment_method': t.payment_method,
                    'provider_name': provider_names.get(t.provider_id),
                    'description': t.notes,
                    # Debits are stored signed; the table shows the magnitude.
                    'amount': abs(amount),
                    'status': t.status,
                    'currency': t.currency,
                }
            )
    return deposits, withdrawals, history


def _round_game_info(serials: set) -> dict:
    """Map a transaction's ``reference_number`` to the game it was played on.

    A ``bet_settlement`` transaction stores the aggregator's round serial as its
    reference, so the round row carries both the game name and the game provider
    the ledger line belongs to. Rounds that predate a game link, or references
    that are not round serials at all (admin adjustments, deposits), simply do
    not appear in the result.
    """
    if not serials:
        return {}
    rows = (
        GameRound.objects.filter(serial_number__in=serials)
        .values_list(
            'serial_number',
            'game_name',
            'game__name',
            'game__provider__name',
            'balance_after',
        )
    )
    return {
        serial: {
            # The round records the table actually played, which is more
            # specific than the catalog row for a lobby launch.
            'game_name': round_game_name or catalog_name,
            'provider': provider_name,
            # Wallet total recorded when the round settled — authoritative
            # post-transaction balance for bet_settlement ledger rows.
            'balance_after': (
                float(balance_after) if balance_after is not None else None
            ),
        }
        for serial, round_game_name, catalog_name, provider_name, balance_after in rows
    }


def _payment_provider_names(provider_ids: set) -> dict:
    """Resolve PSP ids to names. The cashier tables arrived in migration 009 and
    may not exist on a database that has not been migrated, so a failure here
    degrades to unnamed providers rather than breaking the profile."""
    if not provider_ids:
        return {}
    try:
        return dict(
            PaymentProvider.objects.filter(id__in=provider_ids).values_list('id', 'name')
        )
    except Exception:
        return {}


def _aggregator_sports_detail(payload: dict | None) -> dict:
    """The real match/market a sportsbook-style aggregator round was placed on.

    SABA Sports (and other sportsbook products behind the same generic
    game-callback wire protocol) embed it as a JSON-*encoded string* in the
    stake callback's ``data`` key — never in ``GameRound`` itself, which only
    ever gets bet/win totals. Every other aggregator game (slots, live casino)
    has no such key, so this returns ``{}`` for those, which callers fall back
    from cleanly.
    """
    raw = (payload or {}).get('data')
    if not raw:
        return {}
    try:
        inner = json.loads(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError):
        return {}
    if not isinstance(inner, dict):
        return {}
    home = (inner.get('homeName_en') or inner.get('homeName') or '').strip()
    away = (inner.get('awayName_en') or inner.get('awayName') or '').strip()
    selection = (inner.get('betChoice_en') or inner.get('betChoice') or '').strip()
    return {
        'event_name': f'{home} v {away}' if home and away else None,
        'event_key': inner.get('matchId'),
        'sport': inner.get('sportTypeName_en') or inner.get('sportTypeName'),
        'market_name': inner.get('betTypeName_en') or inner.get('betTypeName'),
        'selection_name': selection or None,
        # Kept only to work out _aggregator_winner() below — the aggregator
        # never sends an explicit result/winner field, so a two-way market
        # (both sides named at placement, no draw) is the only case a winner
        # can be inferred safely, by elimination from the settled outcome.
        'home': home or None,
        'away': away or None,
        'odds': inner.get('odds'),
        'placed_at': inner.get('betTime'),
    }


def _aggregator_winner(status: str, detail: dict, fallback_selection) -> str | None:
    """The winning side, only where it can be said with certainty.

    Won: the side the player backed *is* the winner. Lost: only inferable by
    elimination, and only for a genuine two-way match (both sides named, the
    bet was on one of exactly those two) — anything else (3-way, handicap,
    totals, props) is left blank rather than guessed, since a wrong name here
    is worse than none on a betting ledger.
    """
    selection = detail.get('selection_name') or fallback_selection
    if status == 'won':
        return selection
    if status != 'lost':
        return None
    home, away = detail.get('home'), detail.get('away')
    sel = (selection or '').strip().lower()
    if not (home and away and sel):
        return None
    if sel == home.strip().lower():
        return away
    if sel == away.strip().lower():
        return home
    return None


def _sport_bet_rows(user_id: int) -> list[dict]:
    """Sports stakes for the player profile panel.

    Combines exchange ``sport_bets`` with aggregator ``game_rounds`` on
    sports-category games — the same split agent reports use. Live sports play
    lands in ``game_rounds``; the exchange table stays empty until that book
    takes stakes, so reading only ``sport_bets`` left the panel blank.
    """
    merged: list[dict] = []

    exchange = (
        SportBet.objects.select_related('event', 'market')
        .filter(user_id=user_id)
        .order_by('-created_at')[:50]
    )
    for b in exchange:
        merged.append({
            'id': b.id,
            'selection_name': b.selection_name,
            'event_name': b.event.name if b.event_id else None,
            'event_key': b.event.event_key if b.event_id else None,
            'sport': b.event.sport if b.event_id else None,
            'market_name': b.market.name if b.market_id else None,
            # Set by whoever resolves the market — the authoritative result,
            # not a guess. Null until the market settles.
            'winner': b.market.winning_selection if b.market_id else None,
            'side': b.side,
            'odds': float(b.odds),
            'stake': float(b.stake),
            # profit_loss is stored house-signed; the player's P/L is its negative.
            'profit_loss': -float(b.profit_loss),
            'status': b.status,
            'placed_at': (b.placed_at or b.created_at).isoformat(),
            'created_at': b.created_at.isoformat(),
            '_sort': b.created_at,
        })

    sports = _sports_category_slugs()
    if sports:
        rounds = list(
            GameRound.objects.select_related('game')
            .filter(user_id=user_id, game__category__in=sports)
            .order_by('-created_at')[:50]
        )
        # The match/market a round was actually placed on lives in the *stake*
        # callback's raw payload (see _aggregator_sports_detail), keyed by the
        # round's serial number. mahakalworld additionally falls back through
        # `stake_serial` for a round whose result callback has since replaced
        # `serial_number` — dollara's GameRound has no such column yet (see the
        # port report), so only `serial_number` is used here.
        lookup_serials = [r.serial_number for r in rounds if r.serial_number]
        payload_by_serial = dict(
            GameCallbackLog.objects.filter(serial_number__in=lookup_serials)
            .values_list('serial_number', 'decrypted_payload')
        )
        for r in rounds:
            pending = r.settle_status == GameRound.SettleStatus.PENDING
            name = r.game_name or (r.game.name if r.game else None)
            detail = _aggregator_sports_detail(payload_by_serial.get(r.serial_number))
            status = 'pending' if pending else (
                'won' if r.win_amount > r.bet_amount
                else ('lost' if r.win_amount < r.bet_amount else 'settled')
            )
            merged.append({
                # serial_number is unique across rounds and avoids clashing with
                # exchange SportBet ids in the profile table's React keys.
                'id': r.serial_number or r.id,
                'selection_name': detail.get('selection_name') or name,
                'event_name': detail.get('event_name') or name,
                'event_key': detail.get('event_key'),
                'sport': detail.get('sport') or (r.game.category if r.game else None),
                'market_name': detail.get('market_name') or (r.game.category if r.game else None),
                'winner': _aggregator_winner(status, detail, name),
                'side': None,
                'odds': detail.get('odds'),
                'stake': float(r.bet_amount),
                'profit_loss': (
                    None if pending else float(r.win_amount - r.bet_amount)
                ),
                'status': status,
                'placed_at': detail.get('placed_at') or r.created_at.isoformat(),
                'created_at': r.created_at.isoformat(),
                '_sort': r.created_at,
            })

    merged.sort(key=lambda row: row['_sort'], reverse=True)
    for row in merged:
        del row['_sort']
    return merged[:50]


def _player_financials(user_id: int) -> dict:
    """The money summary in the profile header.

    Deposits and withdrawals count completed transactions only. Gross profit is
    the player's casino + sportsbook result; net profit is that less what they
    were given in bonuses, which is what the reference's Net Profit column means.
    """
    money = Transaction.objects.filter(
        user_id=user_id, status=Transaction.Status.COMPLETED
    ).aggregate(
        deposits=Sum('amount', filter=Q(type=Transaction.TxType.DEPOSIT)),
        withdrawals=Sum('amount', filter=Q(type=Transaction.TxType.WITHDRAWAL)),
    )

    rounds = GameRound.objects.filter(user_id=user_id).aggregate(
        plays=Count('id'),
        bet=Sum('bet_amount'),
        won=Sum('win_amount'),
    )
    casino_pl = float((rounds['won'] or 0) - (rounds['bet'] or 0))

    sports_pl = 0.0
    try:
        agg = SportBet.objects.filter(
            user_id=user_id, status__in=SportBet.SETTLED_STATUSES
        ).aggregate(pl=Sum('profit_loss'))
        # Stored house-signed, so the player's result is its negative.
        sports_pl = -float(agg['pl'] or 0)
    except Exception:
        sports_pl = 0.0

    bonus_given = float(
        UserBonus.objects.filter(user_id=user_id).aggregate(t=Sum('amount'))['t'] or 0
    )
    gross_profit = casino_pl + sports_pl

    return {
        'deposit_amount': float(money['deposits'] or 0),
        'withdraw_amount': float(money['withdrawals'] or 0),
        'gross_profit': gross_profit,
        'net_profit': gross_profit - bonus_given,
        'bonus_given': bonus_given,
        'total_plays': rounds['plays'] or 0,
        'total_bet': float(rounds['bet'] or 0),
        'total_won': float(rounds['won'] or 0),
        'games_played_with_real_money': (
            GameRound.objects.filter(user_id=user_id, bet_amount__gt=0)
            .values('game_uid')
            .distinct()
            .count()
        ),
        'visits': LoginHistory.objects.filter(user_id=user_id).count(),
        'last_logged_ip': (
            LoginHistory.objects.filter(user_id=user_id)
            .order_by('-created_at')
            .values_list('ip_address', flat=True)
            .first()
        ),
    }


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


def reset_user_password(user_id: int, new_password: str) -> dict:
    """Set a player's password from the profile popup's Reset Password action."""
    if not new_password or len(new_password) < 6:
        raise ValueError('Password must be at least 6 characters')
    user = User.objects.get(id=user_id)
    user.password_hash = hash_password(new_password)
    user.save(update_fields=['password_hash', 'updated_at'])
    return {'updated': True, 'user_id': user_id}


def find_duplicate_accounts(user_id: int) -> list[dict]:
    """Other accounts that share an identifying trace with this one.

    The reference's Duplicate Accounts action looks for the signals a multi-
    accounting player leaves behind: the same signup IP, a login from the same
    IP, or a shared phone. Each match says which signal matched so an
    operator can judge how strong it is.
    """
    user = User.objects.get(id=user_id)

    ips = set()
    if user.signup_ip:
        ips.add(user.signup_ip)
    ips.update(
        LoginHistory.objects.filter(user_id=user_id)
        .exclude(ip_address__isnull=True)
        .exclude(ip_address='')
        .values_list('ip_address', flat=True)
        .distinct()[:20]
    )

    matched: dict[int, set] = {}

    def _mark(uid, reason):
        if uid and uid != user_id:
            matched.setdefault(uid, set()).add(reason)

    if ips:
        for uid in (
            User.objects.filter(signup_ip__in=ips)
            .exclude(id=user_id)
            .values_list('id', flat=True)
        ):
            _mark(uid, 'signup IP')
        for uid in (
            LoginHistory.objects.filter(ip_address__in=ips)
            .exclude(user_id=user_id)
            .values_list('user_id', flat=True)
            .distinct()
        ):
            _mark(uid, 'login IP')

    if user.phone:
        for uid in (
            User.objects.filter(phone=user.phone)
            .exclude(id=user_id)
            .values_list('id', flat=True)
        ):
            _mark(uid, 'phone')

    if not matched:
        return []

    rows = User.objects.select_related('wallet').filter(id__in=matched.keys())
    out = []
    for u in rows:
        try:
            balance = float(u.wallet.main_balance)
            bonus_balance = float(u.wallet.bonus_balance)
        except Wallet.DoesNotExist:
            balance = 0.0
            bonus_balance = 0.0
        out.append(
            {
                'id': u.id,
                'username': u.username,
                'full_name': u.full_name,
                'phone': u.phone,
                'signup_ip': u.signup_ip,
                'account_status': u.account_status,
                'created_at': u.created_at.isoformat(),
                'main_balance': balance,
                'bonus_balance': bonus_balance,
                'matched_on': sorted(matched[u.id]),
            }
        )
    out.sort(key=lambda r: r['created_at'], reverse=True)
    return out


def get_dashboard_tables(days: int = 7, top_n: int = 10) -> dict:
    """The six breakdown tables on the dashboard: daily deposit/withdrawal/
    signup rollups for the last `days`, plus today's top-`top_n` player leaderboards."""
    now = timezone.now()
    today = now.date()
    since = today - timedelta(days=days - 1)

    def _daily_money(tx_type):
        rows = (
            Transaction.objects.filter(
                type=tx_type,
                status=Transaction.Status.COMPLETED,
                created_at__date__gte=since,
            )
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(amount=Sum('amount'), count=Count('id'))
            .order_by('-day')
        )
        return [
            {
                'date': r['day'].isoformat(),
                'amount': float(r['amount'] or 0),
                'count': r['count'],
                'average': float(r['amount'] or 0) / r['count'] if r['count'] else 0.0,
            }
            for r in rows
        ]

    # Registered members per day, with how many of them went on to deposit.
    # Pulled in one pass: bucket each new user by signup day, then check
    # membership against the set of users who have ever deposited.
    depositor_ids = set(
        Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            status=Transaction.Status.COMPLETED,
        )
        .values_list('user_id', flat=True)
        .distinct()
    )
    signup_rows = (
        User.objects.filter(
            role=User.Role.USER,
            usersetting__is_demo=False,
            created_at__date__gte=since,
        )
        .annotate(day=TruncDate('created_at'))
        .values_list('day', 'id')
    )
    by_day: dict = {}
    for day, uid in signup_rows:
        bucket = by_day.setdefault(day, {'count': 0, 'hadDeposit': 0})
        bucket['count'] += 1
        if uid in depositor_ids:
            bucket['hadDeposit'] += 1
    registered = [
        {
            'date': day.isoformat(),
            'count': b['count'],
            'hadDeposit': b['hadDeposit'],
            'conversionRate': (b['hadDeposit'] / b['count'] * 100) if b['count'] else 0.0,
        }
        for day, b in sorted(by_day.items(), reverse=True)
    ]

    def _top_by(tx_type, order_field):
        """Top players today by transaction count or total amount."""
        rows = (
            Transaction.objects.filter(
                type=tx_type,
                status=Transaction.Status.COMPLETED,
                created_at__date=today,
            )
            .values('user_id', 'user__username', 'user__full_name')
            .annotate(count=Count('id'), total=Sum('amount'))
            .order_by(order_field)[:top_n]
        )
        return [
            {
                'userId': r['user_id'],
                'player': r['user__full_name'] or r['user__username'],
                'count': r['count'],
                'total': float(r['total'] or 0),
            }
            for r in rows
        ]

    # Single largest deposits today, one row per transaction.
    max_rows = (
        Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            status=Transaction.Status.COMPLETED,
            created_at__date=today,
        )
        .select_related('user')
        .order_by('-amount')[:top_n]
    )
    deposit_max = [
        {
            'userId': t.user_id,
            'player': t.user.full_name or t.user.username,
            'amount': float(t.amount),
            'time': t.created_at.isoformat(),
            'method': t.payment_method or '—',
        }
        for t in max_rows
    ]

    return {
        'deposits': _daily_money(Transaction.TxType.DEPOSIT),
        'withdrawals': _daily_money(Transaction.TxType.WITHDRAWAL),
        'registered': registered,
        'depositCountTop': _top_by(Transaction.TxType.DEPOSIT, '-count'),
        'depositMaxTop': deposit_max,
        'withdrawCountTop': _top_by(Transaction.TxType.WITHDRAWAL, '-count'),
    }
