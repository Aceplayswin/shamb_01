import random
import secrets
import string
from datetime import timedelta
from decimal import Decimal

import bcrypt
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError
from django.db.models import BigIntegerField, Count, F, Q, Sum
from django.db.models.functions import Cast
from django.utils import timezone

from core import bonus_services
from core.auth_jwt import sign_token
from core.models import (
    Banner,
    Bet,
    Game,
    GameSession,
    OtpVerification,
    PlatformSetting,
    Transaction,
    User,
    UserBonus,
    UserSetting,
    Wallet,
    WithdrawalStage,
)
from tenants.state import get_current_tenant_id, tenant_atomic


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    """Public alias — used by the admin panel when provisioning staff logins."""
    return _hash_password(password)


def _check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _player_users():
    return User.objects.filter(role=User.Role.USER, usersetting__is_demo=False)


def send_otp(phone: str, channel: str) -> dict:
    otp = f'{random.randint(100000, 999999)}'
    otp_hash = _hash_password(otp)
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    OtpVerification.objects.create(
        phone=phone,
        otp_hash=otp_hash,
        channel=channel,
        expires_at=expires_at,
    )
    cache.set(f'otp:{phone}', {'attempts': 0}, settings.OTP_EXPIRY_MINUTES * 60)
    if settings.DEBUG:
        print(f'[DEV OTP] {phone} via {channel}: {otp}')
    result = {'sent': True, 'expiresIn': settings.OTP_EXPIRY_MINUTES * 60}
    if settings.DEBUG:
        result['otp'] = otp
    return result


def verify_otp(phone: str, otp: str) -> None:
    record = (
        OtpVerification.objects.filter(
            phone=phone, verified=False, expires_at__gt=timezone.now()
        )
        .order_by('-created_at')
        .first()
    )
    if not record:
        raise ValueError('OTP expired or not found')
    if record.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise ValueError('Max attempts exceeded')
    if not _check_password(otp, record.otp_hash):
        record.attempts += 1
        record.save(update_fields=['attempts'])
        raise ValueError('Invalid OTP')
    record.verified = True
    record.save(update_fields=['verified'])
    cache.delete(f'otp:{phone}')


def _create_user_settings(user: User, **kwargs) -> UserSetting:
    if user.role != User.Role.USER:
        raise ValueError('User settings are only for player accounts')
    return UserSetting.objects.create(user=user, **kwargs)


def get_user_settings(user: User) -> UserSetting | None:
    try:
        return user.usersetting
    except UserSetting.DoesNotExist:
        return None


# Player-editable preference fields exposed by the settings page. Anything not in
# this set (kyc_status, fraud_score, demo flags, …) is read-only / system-owned.
_EDITABLE_PREFERENCES = {
    'website_language',
    'communication_language',
    'currency',
    'notifications_enabled',
    'marketing_opt_in',
}


def _serialize_preferences(user: User, prefs: UserSetting | None) -> dict:
    return {
        'full_name': user.full_name,
        'username': user.username,
        'phone': user.phone,
        'email': user.email,
        'kyc_status': prefs.kyc_status if prefs else UserSetting.KycStatus.NONE,
        'account_status': user.account_status,
        'website_language': prefs.website_language if prefs else 'en',
        'communication_language': prefs.communication_language if prefs else 'en',
        'currency': prefs.currency if prefs else 'INR',
        'notifications_enabled': prefs.notifications_enabled if prefs else True,
        'marketing_opt_in': prefs.marketing_opt_in if prefs else False,
    }


def get_user_preferences(user_id: int) -> dict:
    """Read the player's profile + editable preferences for the settings page."""
    user = User.objects.select_related('usersetting').get(id=user_id)
    return _serialize_preferences(user, get_user_settings(user))


def update_user_preferences(user_id: int, changes: dict) -> dict:
    """Persist player-editable preferences, ignoring unknown/read-only keys."""
    user = User.objects.select_related('usersetting').get(id=user_id)
    prefs = get_user_settings(user)
    if prefs is None:
        prefs = _create_user_settings(user)

    applied = {k: v for k, v in changes.items() if k in _EDITABLE_PREFERENCES}
    bool_fields = {'notifications_enabled', 'marketing_opt_in'}
    for field, value in applied.items():
        if field in bool_fields:
            value = bool(value)
        else:
            value = str(value).strip()
            if not value:
                continue
        setattr(prefs, field, value)
    if applied:
        prefs.save(update_fields=list(applied.keys()) + ['updated_at'])
    return _serialize_preferences(user, prefs)


# Player usernames are sequential 8-digit numbers starting here (10000000,
# 10000001, ...). The column stays a CharField — we just store the number as a
# string so the format is purely an API-layer concern.
_USERNAME_START = 10000000


def _next_sequential_username() -> str:
    """Return the next sequential numeric username as a string.

    Looks at existing all-digit usernames, takes the highest one and adds 1.
    Falls back to the starting value when no sequential username exists yet.
    """
    last = (
        User.objects.filter(username__regex=r'^\d+$')
        .annotate(username_num=Cast('username', BigIntegerField()))
        .order_by('-username_num')
        .values_list('username_num', flat=True)
        .first()
    )
    nxt = last + 1 if last is not None and last >= _USERNAME_START else _USERNAME_START
    return str(nxt)


def register_with_otp(
    full_name: str,
    phone: str,
    password: str,
    country_code: str = 'IN',
    referral_code: str | None = None,
) -> dict:
    if User.objects.filter(phone=phone, role=User.Role.USER).exists():
        raise ValueError('Phone number already registered')
    if not password or len(password) < 6:
        raise ValueError('Password must be at least 6 characters')
    voice_id = f'AI_EXEC_{random.randint(1, 50):03d}'
    # Resolve who referred this player before the account exists, so the referral
    # bonus engine can pay the referrer.
    referred_by = bonus_services.resolve_referrer(referral_code)
    password_hash = _hash_password(password)
    # Sequential usernames can collide if two players register at the same instant;
    # the unique constraint then rejects the loser, so we recompute and retry.
    for _attempt in range(5):
        try:
            user = User.objects.create(
                username=_next_sequential_username(),
                phone=phone,
                full_name=full_name,
                country_code=country_code,
                role=User.Role.USER,
                password_hash=password_hash,
            )
            break
        except IntegrityError:
            continue
    else:
        raise ValueError('Could not allocate a username, please try again')
    # Wallet starts empty — the joining bonus is now awarded by the controllable
    # bonus engine (see award_joining_bonus), not a hardcoded balance.
    Wallet.objects.create(user=user)
    _create_user_settings(
        user,
        registration_path=UserSetting.RegistrationPath.OTP,
        phone_verified=True,
        ai_voice_executive_id=voice_id,
        referred_by=referred_by,
        referral_code=bonus_services._generate_referral_code(),
    )
    # Fire the money-based welcome + referral bonuses (each is a no-op if the
    # admin hasn't configured/activated one).
    joining = bonus_services.award_joining_bonus(user.id)
    if referred_by:
        bonus_services.award_referral_bonus(user.id, event='register')
    token = sign_token({'sub': user.id, 'role': User.Role.USER}, tenant=get_current_tenant_id())
    return {
        'userId': user.id,
        'username': username,
        'token': token,
        'welcomeBonus': float(joining.amount) if joining else 0,
        'voiceId': voice_id,
    }


def create_demo_session() -> dict:
    demo_id = f'DEMO_{"".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))}'
    expires_at = timezone.now() + timedelta(minutes=settings.DEMO_SESSION_MINUTES)
    user = User.objects.create(
        username=demo_id,
        role=User.Role.USER,
        account_status=User.AccountStatus.ACTIVE,
    )
    _create_user_settings(
        user,
        is_demo=True,
        demo_expires_at=expires_at,
    )
    Wallet.objects.create(
        user=user,
        main_balance=Decimal('50000'),
        bonus_balance=Decimal('5000'),
    )
    token = sign_token(
        {'sub': user.id, 'role': User.Role.USER, 'type': 'demo'},
        tenant=get_current_tenant_id(),
    )
    cache.set(
        f'demo:{user.id}',
        {'expiresAt': expires_at.isoformat()},
        settings.DEMO_SESSION_MINUTES * 60,
    )
    return {'demoId': demo_id, 'token': token, 'expiresAt': expires_at.isoformat()}


def login_user(phone: str, password: str) -> dict:
    user = User.objects.filter(phone=phone, role=User.Role.USER).first()
    if not user or not user.password_hash:
        raise ValueError('Invalid credentials')
    if user.account_status != User.AccountStatus.ACTIVE:
        raise ValueError('Account suspended')
    if not _check_password(password, user.password_hash):
        raise ValueError('Invalid credentials')
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])
    payload = {'sub': user.id, 'role': User.Role.USER}
    prefs = get_user_settings(user)
    if prefs and prefs.is_demo:
        payload['type'] = 'demo'
    return {'token': sign_token(payload, tenant=get_current_tenant_id()), 'userId': user.id}


def login_admin(username: str, password: str) -> dict:
    admin = User.objects.filter(
        username=username,
        role__in=[User.Role.ADMIN, User.Role.SUPER_ADMIN],
        account_status=User.AccountStatus.ACTIVE,
    ).first()
    if not admin or not admin.password_hash or not _check_password(password, admin.password_hash):
        raise ValueError('Invalid credentials')
    admin.last_login_at = timezone.now()
    admin.save(update_fields=['last_login_at'])
    return {
        'token': sign_token({'sub': admin.id, 'role': admin.role}, tenant=get_current_tenant_id()),
        'role': admin.role,
    }


def change_password(user_id: int, current_password: str, new_password: str) -> dict:
    """Player-initiated password change. Verifies the current password first."""
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise ValueError('Account not found')
    if not user.password_hash:
        raise ValueError('This account has no password set. Please contact support.')
    if not current_password or not _check_password(current_password, user.password_hash):
        raise ValueError('Current password is incorrect')
    if not new_password or len(new_password) < 6:
        raise ValueError('New password must be at least 6 characters')
    if new_password == current_password:
        raise ValueError('New password must be different from the current one')
    user.password_hash = _hash_password(new_password)
    user.save(update_fields=['password_hash', 'updated_at'])
    return {'updated': True}


# --- Mobile app (APK) distribution -----------------------------------------

APP_DOWNLOAD_KEY = 'mobile_app'

APP_DOWNLOAD_DEFAULTS = {
    'enabled': False,
    'apk_url': '',
    'version': '',
    'size_mb': None,
    'min_android': '',
    'release_notes': '',
    'ios_url': '',
}


def get_app_download() -> dict:
    """Public APK/app-install config, as set by the product admin."""
    row = PlatformSetting.objects.filter(setting_key=APP_DOWNLOAD_KEY).first()
    value = row.setting_value if row and isinstance(row.setting_value, dict) else {}
    config = {**APP_DOWNLOAD_DEFAULTS, **value}
    # An app with no download URL is never "available", whatever the flag says.
    config['available'] = bool(config.get('enabled') and config.get('apk_url'))
    config['updated_at'] = row.updated_at.isoformat() if row else None
    return config


def _require_player(user_id: int) -> User:
    user = User.objects.filter(id=user_id, role=User.Role.USER).first()
    if not user:
        raise ValueError('User account not found. Please log in again.')
    return user


def get_wallet(user_id: int) -> dict:
    _require_player(user_id)
    wallet, _ = Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': 'INR'})
    main = float(wallet.main_balance)
    locked = float(wallet.locked_balance)
    bonus = float(wallet.bonus_balance)
    return {
        # `real` and `bonus` are the two balances a player is shown; `main` is
        # kept as an alias so existing clients keep working.
        'real': main,
        'main': main,
        'bonus': bonus,
        'total': main + bonus,
        'exposure': float(wallet.exposure_balance),
        # Held for a withdrawal that is still awaiting admin approval. The money
        # has NOT left the real balance yet — approval is what debits it.
        'locked': locked,
        'pendingWithdrawal': locked,
        'currency': wallet.currency,
        'available': main - locked,
    }


# Human-readable labels for the bonus sources surfaced in the wallet breakdown.
_BONUS_SOURCE_LABELS = {
    UserBonus.Source.JOINING: 'Joining / Welcome bonus',
    UserBonus.Source.DEPOSIT: 'Deposit bonus',
    UserBonus.Source.REFERRAL: 'Referral bonus',
    UserBonus.Source.GAME: 'Game / Play bonus',
    UserBonus.Source.CASHBACK: 'Cashback bonus',
    UserBonus.Source.PROMO: 'Promo code bonus',
    UserBonus.Source.MANUAL: 'Manual bonus',
}


def get_wallet_breakdown(user_id: int) -> dict:
    """Itemised, source-by-source view of the player's wallet for the Wallet page.

    On top of the raw balances (:func:`get_wallet`) this returns:

    * ``bonuses`` — active bonus amounts grouped by source (joining, deposit,
      referral, game, cashback, promo, manual) off the ``user_bonuses`` ledger.
    * ``deposits`` / ``withdrawals`` — lifetime completed totals from the
      transaction ledger.
    * ``gamePlay`` — total staked / won / net P&L across all game sessions.
    """
    _require_player(user_id)
    base = get_wallet(user_id)

    # --- Outstanding bonuses grouped by source (rewards not yet paid out) ---
    # 'pending' = owed once wagering clears; 'active' = legacy locked credits.
    bonus_rows = (
        UserBonus.objects.filter(
            user_id=user_id,
            status__in=(UserBonus.Status.PENDING, UserBonus.Status.ACTIVE),
        )
        .values('source')
        .annotate(amount=Sum('amount'))
    )
    by_source = {r['source']: float(r['amount'] or 0) for r in bonus_rows}
    bonuses = [
        {
            'source': source,
            'label': label,
            'amount': by_source.get(source, 0.0),
        }
        for source, label in _BONUS_SOURCE_LABELS.items()
    ]

    # --- Lifetime deposit / withdrawal totals (completed only) ---
    def _tx_total(tx_type: str) -> float:
        row = Transaction.objects.filter(
            user_id=user_id,
            type=tx_type,
            status=Transaction.Status.COMPLETED,
        ).aggregate(total=Sum('amount'))
        return float(row['total'] or 0)

    deposits_total = _tx_total(Transaction.TxType.DEPOSIT)
    withdrawals_total = _tx_total(Transaction.TxType.WITHDRAWAL)

    # --- Game play totals (staked / won / net) across all sessions ---
    play = GameSession.objects.filter(user_id=user_id).aggregate(
        bet=Sum('total_bet'),
        win=Sum('total_win'),
        net=Sum('profit_loss'),
    )
    game_play = {
        'staked': float(play['bet'] or 0),
        'won': float(play['win'] or 0),
        'net': float(play['net'] or 0),
    }

    return {
        **base,
        'bonuses': bonuses,
        'bonusTotal': sum(b['amount'] for b in bonuses),
        'deposits': deposits_total,
        'withdrawals': withdrawals_total,
        'gamePlay': game_play,
    }


def create_deposit(
    user_id: int,
    amount: float,
    payment_method: str,
    currency: str = 'INR',
    reference_number: str | None = None,
) -> dict:
    _require_player(user_id)
    if amount <= 0:
        raise ValueError('Amount must be greater than zero')
    Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': currency})
    with tenant_atomic():
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.DEPOSIT,
            amount=Decimal(str(amount)),
            currency=currency,
            status=Transaction.Status.PENDING,
            payment_method=payment_method,
            reference_number=(reference_number or None),
        )
    # No balance change here — the deposit stays PENDING until the product admin
    # confirms it (see confirm_deposit). Nothing is credited on the user's action.
    return {'transactionId': tx.id, 'status': 'pending'}


def confirm_deposit(transaction_id: int, reference_number: str) -> dict:
    """Admin action: credit a pending deposit to the user's main balance.

    Idempotent — a deposit that is not PENDING is never credited twice.
    """
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id, type=Transaction.TxType.DEPOSIT
        )
        if tx.status != Transaction.Status.PENDING:
            raise ValueError(f'Deposit already {tx.status}')
        amount = tx.amount
        tx.status = Transaction.Status.COMPLETED
        # Keep any reference the user already supplied; only fill it if missing.
        if reference_number and not tx.reference_number:
            tx.reference_number = reference_number
        tx.save(update_fields=['status', 'reference_number', 'updated_at'])
        Wallet.objects.filter(user_id=tx.user_id).update(
            main_balance=F('main_balance') + amount
        )
    # Money-based bonuses that fire on a confirmed deposit: the deposit-match
    # bonus for this player, and any referral bonus that pays on first deposit.
    # Each is a no-op if the admin hasn't configured one; failures here must not
    # roll back the credited deposit.
    bonus = None
    try:
        bonus = bonus_services.award_deposit_bonus(tx.user_id, amount, tx.id)
        bonus_services.award_referral_bonus(tx.user_id, event='deposit', deposit_amount=amount)
    except Exception:
        pass
    return {
        'credited': float(amount),
        'bonusCredited': float(bonus.amount) if bonus else 0,
    }


def reject_deposit(transaction_id: int, reason: str) -> dict:
    """Admin action: reject a pending deposit. No balance is ever credited."""
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id, type=Transaction.TxType.DEPOSIT
        )
        if tx.status != Transaction.Status.PENDING:
            raise ValueError(f'Deposit already {tx.status}')
        tx.status = Transaction.Status.REJECTED
        tx.notes = reason or tx.notes
        tx.save(update_fields=['status', 'notes', 'updated_at'])
    return {'rejected': True}


def create_withdrawal(user_id: int, amount: float, payment_method: str) -> dict:
    _require_player(user_id)
    wallet_data = get_wallet(user_id)
    if amount > wallet_data['available']:
        raise ValueError('Insufficient balance')
    if amount < 500:
        raise ValueError('Minimum withdrawal is ₹500')

    with tenant_atomic():
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.WITHDRAWAL,
            amount=Decimal(str(amount)),
            status=Transaction.Status.PENDING,
            payment_method=payment_method,
        )
        # Place a HOLD only — the balance itself is untouched until an admin
        # approves. The hold is what stops the same money being staked or
        # withdrawn twice while the request sits in the queue.
        Wallet.objects.filter(user_id=user_id).update(
            locked_balance=F('locked_balance') + Decimal(str(amount))
        )
        for stage in (
            'account_verification',
            'duplicate_check',
            'wagering_compliance',
            'final_approval',
            'payment_processing',
        ):
            WithdrawalStage.objects.create(transaction=tx, stage=stage, status='pending')

    # The withdrawal now waits for the product admin to approve or reject it
    # (see approve_withdrawal / reject_withdrawal).
    return {'transactionId': tx.id, 'status': 'pending'}


def approve_withdrawal(transaction_id: int) -> dict:
    """Admin action: pay out a pending withdrawal.

    This is the *only* point at which a withdrawal reduces the player's
    balance — requesting one merely holds the funds. Debits the real balance
    and releases the hold together. Idempotent.
    """
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id, type=Transaction.TxType.WITHDRAWAL
        )
        if tx.status in (Transaction.Status.COMPLETED, Transaction.Status.REJECTED):
            raise ValueError(f'Withdrawal already {tx.status}')
        wallet = Wallet.objects.select_for_update().get(user_id=tx.user_id)
        if wallet.main_balance < tx.amount:
            raise ValueError('User balance is no longer sufficient for this payout')
        tx.status = Transaction.Status.COMPLETED
        tx.save(update_fields=['status', 'updated_at'])
        wallet.main_balance -= tx.amount
        wallet.locked_balance = max(Decimal('0'), wallet.locked_balance - tx.amount)
        wallet.save(update_fields=['main_balance', 'locked_balance', 'updated_at'])
        # `withdrawal_stages.status` is ENUM('pending','passed','failed','review') —
        # anything outside that set is rejected by MySQL with error 1265 and rolls
        # back the whole approval.
        WithdrawalStage.objects.filter(transaction=tx).update(status='passed')
    return {'approved': True, 'debited': float(tx.amount)}


def reject_withdrawal(transaction_id: int, reason: str) -> dict:
    """Admin action: reject a pending withdrawal.

    Only the hold is released — nothing was ever debited, so the player's real
    balance is left exactly as it was. Idempotent.
    """
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id, type=Transaction.TxType.WITHDRAWAL
        )
        if tx.status in (Transaction.Status.COMPLETED, Transaction.Status.REJECTED):
            raise ValueError(f'Withdrawal already {tx.status}')
        tx.status = Transaction.Status.REJECTED
        tx.notes = reason or tx.notes
        tx.save(update_fields=['status', 'notes', 'updated_at'])
        wallet = Wallet.objects.select_for_update().get(user_id=tx.user_id)
        wallet.locked_balance = max(Decimal('0'), wallet.locked_balance - tx.amount)
        wallet.save(update_fields=['locked_balance', 'updated_at'])
        # See approve_withdrawal — 'rejected' is not a valid stage status.
        WithdrawalStage.objects.filter(transaction=tx).update(status='failed')
    return {'rejected': True}


def list_games(
    category: str | None = None,
    featured: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
):
    qs = Game.objects.filter(is_active_web=True, is_active=True).select_related('provider')
    # Hide games whose provider has been disabled in the admin panel. Games
    # without a provider (provider_id NULL) stay visible.
    qs = qs.filter(Q(provider__isnull=True) | Q(provider__is_active=True))
    if category:
        qs = qs.filter(category=category)
    if featured:
        qs = qs.filter(is_featured=True)
    if search:
        term = search.strip()
        if term:
            qs = qs.filter(
                Q(name__icontains=term)
                | Q(slug__icontains=term)
                | Q(provider__name__icontains=term),
            )
    qs = qs.order_by('sort_order', '-play_count')[offset : offset + limit]
    return [
        {
            'id': g.id,
            'name': g.name,
            'slug': g.slug,
            'category': g.category,
            'game_uid': g.game_uid,
            'game_type': g.game_type,
            'thumbnail_url': g.thumbnail_url,
            'rtp': float(g.rtp) if g.rtp else None,
            'min_bet': float(g.min_bet),
            'max_bet': float(g.max_bet),
            'is_featured': g.is_featured,
            'is_provably_fair': g.is_provably_fair,
            'play_count': g.play_count,
            'provider_name': g.provider.name if g.provider else None,
            'provider_slug': g.provider.slug if g.provider else None,
        }
        for g in qs
    ]


def list_active_banners():
    """Public home-page hero banners the product admin has set to active,
    in display order. Returns [] when none are configured."""
    return [
        {
            'id': b.id,
            'title': b.title,
            'image_url': b.image_url,
            'link_url': b.link_url,
        }
        for b in Banner.objects.filter(status='active').order_by('sort_order', 'id')
    ]


def place_bet(user_id: int, game_id: int, amount: float, odds: float | None = None) -> dict:
    with tenant_atomic():
        wallet = Wallet.objects.select_for_update().get(user_id=user_id)
        available = wallet.main_balance - wallet.locked_balance
        if available < Decimal(str(amount)):
            raise ValueError('Insufficient balance')
        bet = Bet.objects.create(
            user_id=user_id,
            game_id=game_id,
            bet_amount=Decimal(str(amount)),
            odds=Decimal(str(odds)) if odds else None,
        )
        wallet.main_balance -= Decimal(str(amount))
        wallet.save(update_fields=['main_balance', 'updated_at'])
        Game.objects.filter(id=game_id).update(play_count=F('play_count') + 1)
    return {'betId': bet.id, 'status': 'open'}


def get_dashboard_stats() -> dict:
    today = timezone.now().date()
    users_qs = _player_users()
    deposits_today = Transaction.objects.filter(
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.COMPLETED,
        created_at__date=today,
    ).aggregate(total=Sum('amount'), count=Count('id'))
    withdrawals_today = Transaction.objects.filter(
        type=Transaction.TxType.WITHDRAWAL,
        created_at__date=today,
    ).aggregate(
        completed=Sum('amount', filter=Q(status=Transaction.Status.COMPLETED)),
        count=Count('id'),
        pending=Count('id', filter=Q(status=Transaction.Status.PENDING)),
    )
    liability = Wallet.objects.aggregate(
        total=Sum(F('main_balance') + F('bonus_balance'))
    )
    active = users_qs.filter(
        last_login_at__gte=timezone.now() - timedelta(minutes=15)
    ).count()
    return {
        'totalUsers': users_qs.count(),
        'signupsToday': users_qs.filter(created_at__date=today).count(),
        'activePlayers': active,
        'depositsToday': {
            'amount': float(deposits_today['total'] or 0),
            'count': deposits_today['count'] or 0,
        },
        'withdrawalsToday': {
            'amount': float(withdrawals_today['completed'] or 0),
            'count': withdrawals_today['count'] or 0,
            'pending': withdrawals_today['pending'] or 0,
        },
        'totalLiability': float(liability['total'] or 0),
    }


def list_users(
    status: str | None = None,
    kyc_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    qs = _player_users().select_related('wallet', 'usersetting')
    if status:
        qs = qs.filter(account_status=status)
    if kyc_status:
        qs = qs.filter(usersetting__kyc_status=kyc_status)
    qs = qs.order_by('-created_at')[offset : offset + limit]
    result = []
    for u in qs:
        try:
            w = u.wallet
        except Wallet.DoesNotExist:
            w = None
        prefs = get_user_settings(u)
        result.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name,
            'phone': u.phone,
            'email': u.email,
            'kyc_status': prefs.kyc_status if prefs else UserSetting.KycStatus.NONE,
            'account_status': u.account_status,
            'created_at': u.created_at.isoformat(),
            'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
            'main_balance': float(w.main_balance) if w else 0,
            'bonus_balance': float(w.bonus_balance) if w else 0,
        })
    return result
