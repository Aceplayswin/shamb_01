import logging
import random
import re
import secrets
import string
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import bcrypt
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import IntegrityError
from django.db.models import BigIntegerField, Count, F, Q, Sum
from django.db.models.functions import Abs, Cast, Substr
from django.utils import timezone

from core import bonus_services
from core.data_export import IST
from core.auth_jwt import sign_token
from core.models import (
    Banner,
    Bet,
    Faq,
    Game,
    GameSession,
    PlatformSetting,
    PromotionPoster,
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
# this set (fraud_score, demo flags, …) is read-only / system-owned.
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
        'account_status': user.account_status,
        # Identity/registration details the profile page displays. Without them
        # it rendered "Player ID", "Region", "Member since" and "Last login" as
        # empty dashes even though the values exist on the account.
        'id': user.id,
        'state': user.state,
        'country_code': user.country_code,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
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


# Player usernames are the first name off the account holder's full name plus a
# two-digit counter (dev01, dev02, ...), so an id reads as the person rather than
# as a row number. The counter is per-name: the first "dev" is dev01 regardless of
# how many other players exist.
_USERNAME_FALLBACK_SLUG = 'usr'
_USERNAME_DIGITS = 2
_USERNAME_START = 1
# Leaves room under the column's 50-char limit for the counter, including the
# 3+ digit ones a very common first name eventually reaches.
_USERNAME_SLUG_MAX = 20


def _username_slug(full_name: str) -> str:
    """Reduce a full name to the first-name slug a username is built on.

    Takes the first whitespace-separated token and keeps only ASCII letters and
    digits, lowercased ("Ravi Kumar" -> "ravi", "O'Brien" -> "obrien"). Names
    that leave nothing usable -- punctuation only, or a script with no ASCII at
    all -- fall back to the old 'usr' prefix so sign-up still succeeds.
    """
    first = (full_name or '').strip().split()
    slug = re.sub(r'[^a-z0-9]', '', first[0].lower()) if first else ''
    # A slug that starts with a digit would blur into the counter, so prefix it.
    if slug and slug[0].isdigit():
        slug = f'{_USERNAME_FALLBACK_SLUG}{slug}'
    return slug[:_USERNAME_SLUG_MAX] or _USERNAME_FALLBACK_SLUG


def _format_username(slug: str, seq: int) -> str:
    """Render a counter as a username (dev01, and dev100 once 99 is passed)."""
    return f'{slug}{seq:0{_USERNAME_DIGITS}d}'


def _next_sequential_username(full_name: str = '') -> str:
    """Return the next free username for this account holder's first name.

    Takes the highest counter already issued for the slug and adds 1, so the
    counter rolls past two digits (dev99 -> dev100) rather than failing once a
    common first name fills its 100 slots. Only exact ``slug + digits`` rows
    count: an agent-typed lookalike such as "dev.k" or "devtest" shares the
    prefix but is not a counter and must not be read as one.

    Racy by nature -- two players named Dev registering at once compute the same
    counter. The unique index rejects the loser and the caller's retry loop
    recomputes, which is also what covers a collision with an agent-typed name.
    """
    slug = _username_slug(full_name)
    counter_re = rf'^{re.escape(slug)}[0-9]+$'
    last = (
        User.objects.filter(username__regex=counter_re)
        .annotate(
            username_num=Cast(Substr('username', len(slug) + 1), BigIntegerField())
        )
        .order_by('-username_num')
        .values_list('username_num', flat=True)
        .first()
    )
    nxt = last + 1 if last is not None else _USERNAME_START
    return _format_username(slug, nxt)


def register_user(
    full_name: str,
    phone: str,
    password: str,
    country_code: str = 'IN',
    referral_code: str | None = None,
    *,
    affiliate_ref: str | None = None,
    affiliate_sub: str | None = None,
    affiliate_click_id=None,
    signup_ip: str | None = None,
) -> dict:
    """Direct sign-up: full name + phone + password, no verification step."""
    full_name = (full_name or '').strip()
    phone = (phone or '').strip()
    if not full_name:
        raise ValueError('Full name is required')
    if not phone:
        raise ValueError('Phone number is required')
    if User.objects.filter(phone=phone, role=User.Role.USER).exists():
        raise ValueError('Phone number already registered')
    if not password or len(password) < 6:
        raise ValueError('Password must be at least 6 characters')
    voice_id = f'AI_EXEC_{random.randint(1, 50):03d}'
    # Resolve who referred this player before the account exists, so the referral
    # bonus engine can pay the referrer.
    referred_by = bonus_services.resolve_referrer(referral_code)
    password_hash = _hash_password(password)
    # One transaction for the whole account: a failure part-way through (settings,
    # wallet, bonuses) must not leave a signed-up user the player can't log into.
    with tenant_atomic():
        # Sequential usernames can collide if two players register at the same instant;
        # the unique constraint then rejects the loser, so we recompute and retry.
        # The inner block is a savepoint — swallowing IntegrityError without one
        # would leave the outer transaction unusable.
        for _attempt in range(5):
            try:
                with tenant_atomic():
                    user = User.objects.create(
                        username=_next_sequential_username(full_name),
                        phone=phone,
                        full_name=full_name,
                        country_code=country_code,
                        role=User.Role.USER,
                        password_hash=password_hash,
                        signup_ip=signup_ip,
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
            registration_path=UserSetting.RegistrationPath.DIRECT,
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
    # Affiliate attribution runs AFTER the transaction commits, in its own
    # try/except. An affiliate bug must never roll back a created account — the
    # cost of getting this wrong is a player who cannot log into an account they
    # just made, versus a missed referral that a backfill can repair.
    if affiliate_ref:
        try:
            # Imported here, not at module scope: core.affiliate_services imports
            # the password helpers from this module, so a top-level import would
            # be circular.
            from core import affiliate_services

            affiliate_services.attribute_signup(
                user.id, affiliate_ref, affiliate_sub, affiliate_click_id,
                ip=signup_ip, phone=phone,
            )
        except Exception:
            logging.getLogger('affiliate').exception(
                'attribute_signup failed for user %s', user.id
            )

    session_id = uuid.uuid4().hex
    user.active_session_id = session_id
    user.save(update_fields=['active_session_id'])
    token = sign_token(
        {'sub': user.id, 'role': User.Role.USER, 'sid': session_id},
        tenant=get_current_tenant_id(),
    )
    return {
        'userId': user.id,
        'username': user.username,
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
        main_balance=Decimal('1000'),
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
    session_id = uuid.uuid4().hex
    user.last_login_at = timezone.now()
    user.active_session_id = session_id
    user.save(update_fields=['last_login_at', 'active_session_id'])
    payload = {'sub': user.id, 'role': User.Role.USER, 'sid': session_id}
    prefs = get_user_settings(user)
    if prefs and prefs.is_demo:
        payload['type'] = 'demo'
    return {'token': sign_token(payload, tenant=get_current_tenant_id()), 'userId': user.id}


def login_admin(username: str, password: str) -> dict:
    admin = User.objects.filter(
        username=username,
        role=User.Role.ADMIN,
        account_status=User.AccountStatus.ACTIVE,
    ).first()
    if not admin or not admin.password_hash or not _check_password(password, admin.password_hash):
        raise ValueError('Invalid credentials')
    # Admins may be signed in on several devices/browsers at once, so unlike
    # login_user this neither rotates active_session_id nor embeds a 'sid' —
    # earlier admin tokens stay valid until they expire.
    admin.last_login_at = timezone.now()
    admin.save(update_fields=['last_login_at'])
    return {
        'token': sign_token(
            {'sub': admin.id, 'role': admin.role},
            tenant=get_current_tenant_id(),
        ),
        'role': admin.role,
        # Returned so the caller can attribute the login-history row.
        'adminId': admin.id,
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


# --- Social / support links (footer + floating WhatsApp) -------------------

SOCIAL_LINKS_KEY = 'social_links'

SOCIAL_LINKS_DEFAULTS = {
    'facebook': '',
    'instagram': '',
    'twitter': '',
    'whatsapp': 'https://wa.link/mahakalworld',
}


def get_social_links() -> dict:
    """Public social URLs set by the product admin (empty string = hidden)."""
    row = PlatformSetting.objects.filter(setting_key=SOCIAL_LINKS_KEY).first()
    value = row.setting_value if row and isinstance(row.setting_value, dict) else {}
    config = {**SOCIAL_LINKS_DEFAULTS}
    for key in SOCIAL_LINKS_DEFAULTS:
        raw = value.get(key, SOCIAL_LINKS_DEFAULTS[key])
        config[key] = (raw or '').strip() if isinstance(raw, str) else ''
    config['updated_at'] = row.updated_at.isoformat() if row else None
    return config


def _require_player(user_id: int) -> User:
    user = User.objects.filter(id=user_id, role=User.Role.USER).first()
    if not user:
        raise ValueError('User account not found. Please log in again.')
    return user


# A withdrawal still waiting on an admin decision. `processing` counts too: the
# console lists it under the Pending tab (admin_services.CASHIER_TABS).
_OPEN_WITHDRAWAL_STATUSES = (Transaction.Status.PENDING, Transaction.Status.PROCESSING)

PENDING_WITHDRAWAL_MESSAGE = (
    'You already have a withdrawal request pending. You can place a new one '
    'once it has been approved or rejected.'
)


def _has_open_withdrawal(user_id: int) -> bool:
    return Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.WITHDRAWAL,
        status__in=_OPEN_WITHDRAWAL_STATUSES,
    ).exists()


# A deposit still waiting on an admin decision. `processing` counts too: the
# console lists it under the Pending tab (admin_services.CASHIER_TABS), same
# as an open withdrawal.
_OPEN_DEPOSIT_STATUSES = (Transaction.Status.PENDING, Transaction.Status.PROCESSING)

PENDING_DEPOSIT_MESSAGE = (
    'You already have a deposit request pending. You can place a new one '
    'once it has been approved or rejected.'
)


def _has_open_deposit(user_id: int) -> bool:
    return Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        status__in=_OPEN_DEPOSIT_STATUSES,
    ).exists()


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
        # Only one withdrawal may await review at a time (create_withdrawal);
        # the withdraw page uses this to lock its form until the admin acts.
        'hasPendingWithdrawal': _has_open_withdrawal(user_id),
        # Same rule for deposits (create_deposit): the deposit page locks its
        # form until the open request is approved or rejected.
        'hasPendingDeposit': _has_open_deposit(user_id),
        'currency': wallet.currency,
        # Withdrawable cash. Deliberately excludes `bonus`: bonus money is
        # credited on award but can only be staked, never cashed out, until
        # wagering converts it into the real balance (bonus_services).
        'available': main - locked,
        'withdrawable': main - locked,
        # What can be staked — real money plus bonus credit. Always >= the
        # withdrawable figure; the gap is bonus still working off its wagering.
        'playable': main + bonus - locked,
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

    * ``bonuses`` — bonus amounts still working off their wagering requirement,
      grouped by source (joining, deposit, referral, game, cashback, promo,
      manual) off the ``user_bonuses`` ledger. Credited and playable, but not
      withdrawable yet.
    * ``deposits`` / ``withdrawals`` — lifetime completed totals from the
      transaction ledger.
    * ``gamePlay`` — total staked / won / net P&L across all game sessions.
    """
    _require_player(user_id)
    base = get_wallet(user_id)

    # --- Bonuses grouped by source (credited, wagering not yet cleared) ---
    # These amounts are already in bonus_balance and playable; they are not
    # withdrawable until wagering converts them into the real balance.
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


# --- payment proof (manual deposit screenshots) ----------------------------

# Deliberately narrower than the admin uploader: these files come from
# unauthenticated-until-login players, so SVG is excluded (it can carry script
# that would run if the file were ever served inline) and every upload must
# *look* like a real image, not merely be named one.
PROOF_ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
PROOF_MAX_BYTES = 5 * 1024 * 1024

# Leading bytes each accepted format must start with. A file whose extension
# says .png but whose bytes say otherwise is rejected rather than stored.
_IMAGE_MAGIC = (
    b'\x89PNG\r\n\x1a\n',   # PNG
    b'\xff\xd8\xff',          # JPEG
    b'RIFF',                    # WEBP (RIFF....WEBP)
)


def _looks_like_image(file) -> bool:
    """Sniff the file header instead of trusting the client-supplied name."""
    pos = file.tell()
    try:
        file.seek(0)
        head = file.read(16)
    finally:
        file.seek(pos)
    if not head.startswith(_IMAGE_MAGIC):
        return False
    # WEBP is RIFF-framed; make sure it is actually WEBP and not another RIFF type.
    if head.startswith(b'RIFF') and head[8:12] != b'WEBP':
        return False
    return True


def save_payment_proof(user_id: int, file) -> str:
    """Store a player's payment screenshot and return its URL.

    Validates type and size before anything is written. The file is namespaced
    per tenant like every other upload; the returned URL is what gets stamped on
    the deposit row for the admin to review.
    """
    _require_player(user_id)
    if file is None:
        raise ValueError('No screenshot uploaded')
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in (file.name or '') else ''
    if ext not in PROOF_ALLOWED_EXTENSIONS:
        raise ValueError('Upload a PNG, JPG or WEBP image')
    if file.size > PROOF_MAX_BYTES:
        raise ValueError('Screenshot too large (max 5MB)')
    if not _looks_like_image(file):
        raise ValueError('That file is not a valid image')

    tenant_key = get_current_tenant_id() or 'default'
    filename = f'{uuid.uuid4().hex}.{ext}'
    path = default_storage.save(f'uploads/{tenant_key}/deposits/{filename}', file)
    return default_storage.url(path)


def _normalize_deposit_reference(reference_number: str | None) -> str | None:
    """Strip whitespace; empty strings become None (UTR stays optional)."""
    if reference_number is None:
        return None
    ref = str(reference_number).strip()
    return ref or None


def _assert_unique_deposit_reference(
    reference_number: str, exclude_id: int | None = None
) -> None:
    """Reject a UTR that already belongs to any deposit (any status).

    Scoped to deposits only — ``reference_number`` is reused for withdrawals
    and bet settlements, so a table-wide unique constraint is unsafe.
    """
    qs = Transaction.objects.filter(
        type=Transaction.TxType.DEPOSIT,
        reference_number=reference_number,
    )
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)
    if qs.exists():
        raise ValueError('This UTR / reference number has already been used')


def create_deposit(
    user_id: int,
    amount: float,
    payment_method: str,
    currency: str = 'INR',
    reference_number: str | None = None,
    payment_proof_url: str | None = None,
    *,
    affiliate_ref: str | None = None,
    affiliate_sub: str | None = None,
    affiliate_click_id=None,
    client_ip: str | None = None,
) -> dict:
    """Player action: request a deposit.

    A player may have only one deposit awaiting review: a new request is
    refused until the admin approves or rejects the open one.
    """
    _require_player(user_id)
    if amount <= 0:
        raise ValueError('Amount must be greater than zero')
    # Checked before opening a transaction so a repeat click fails fast. The
    # locked re-check below is what actually serialises two requests at once.
    if _has_open_deposit(user_id):
        raise ValueError(PENDING_DEPOSIT_MESSAGE)
    reference_number = _normalize_deposit_reference(reference_number)
    Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': currency})
    with tenant_atomic():
        # Re-check under the wallet row lock so two requests fired together
        # queue here — the second then sees the first's pending row.
        Wallet.objects.select_for_update().get(user_id=user_id)
        if _has_open_deposit(user_id):
            raise ValueError(PENDING_DEPOSIT_MESSAGE)
        if reference_number:
            _assert_unique_deposit_reference(reference_number)
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.DEPOSIT,
            amount=Decimal(str(amount)),
            currency=currency,
            status=Transaction.Status.PENDING,
            payment_method=payment_method,
            reference_number=reference_number,
            # Screenshot evidence for a manual payment, reviewed before crediting.
            payment_proof_url=(payment_proof_url or None),
        )
    # No balance change here — the deposit stays PENDING until the product admin
    # confirms it (see confirm_deposit). Nothing is credited on the user's action.
    # The tracking params are optional. When the player still has them, this
    # ties them to the link so the confirmed deposit can count as an FTD.
    # A failure here must not reject a deposit the player already paid.
    if affiliate_ref or affiliate_click_id:
        try:
            from core import affiliate_services

            phone = User.objects.filter(id=user_id).values_list('phone', flat=True).first()
            affiliate_services.ensure_deposit_attribution(
                user_id, affiliate_ref, affiliate_sub, affiliate_click_id,
                ip=client_ip, phone=phone,
            )
        except Exception:
            logging.getLogger('affiliate').exception(
                'ensure_deposit_attribution failed for user %s', user_id
            )
    return {'transactionId': tx.id, 'status': 'pending', 'paymentProofUrl': tx.payment_proof_url}


def confirm_deposit(transaction_id: int, reference_number: str) -> dict:
    """Admin action: credit a pending deposit to the user's main balance.

    Idempotent — a deposit that is not PENDING is never credited twice.
    """
    reference_number = _normalize_deposit_reference(reference_number)
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
            _assert_unique_deposit_reference(reference_number, exclude_id=tx.id)
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
        logging.getLogger('affiliate').exception(
            'deposit bonus failed for tx %s', tx.id
        )
    # Stamps the first deposit and accumulates lifetime totals on the
    # affiliate referral, if this player came from one. Kept separate from the
    # bonus call so a bonus error cannot skip the FTD. No commission is
    # awarded here: that happens in the nightly run.
    try:
        from core import affiliate_services

        affiliate_services.record_deposit(tx.user_id, amount, tx.id)
    except Exception:
        logging.getLogger('affiliate').exception(
            'record_deposit failed for tx %s', tx.id
        )
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


# Payout destination fields required per method. The player fills these in on
# the withdraw form; an admin reads them back off the pending queue to actually
# send the money, so a request missing them cannot be paid.
WITHDRAWAL_DESTINATION_FIELDS = {
    'upi': ('upiId',),
    'bank_transfer': ('accountName', 'accountNumber', 'ifsc', 'bankName'),
    'crypto': ('network', 'walletAddress'),
}

# Short labels for the admin-facing reference string (title-casing the keys
# would render "Upi Id" / "Ifsc Code").
_REFERENCE_LABELS = {
    'upiId': 'UPI',
    'accountName': 'Name',
    'accountNumber': 'A/C',
    'ifsc': 'IFSC',
    'bankName': 'Bank',
    'network': 'Network',
    'walletAddress': 'Wallet',
}

# Human labels for the validation error, so the player is told which box to fill.
_DESTINATION_LABELS = {
    'upiId': 'UPI ID',
    'accountName': 'account holder name',
    'accountNumber': 'account number',
    'ifsc': 'IFSC code',
    'bankName': 'bank name',
    'network': 'network',
    'walletAddress': 'wallet address',
}


def _format_destination(payment_method: str, destination: dict | None) -> str:
    """Validate the payout details and flatten them for the admin queue.

    Returned as a compact "Key: value" string because the pending-withdrawals
    payload already carries ``reference_number`` — no schema change is needed
    for an admin to see where the money must go.
    """
    required = WITHDRAWAL_DESTINATION_FIELDS.get(payment_method)
    if not required:
        raise ValueError('Unsupported withdrawal method.')

    details = destination or {}
    cleaned = {}
    missing = []
    for key in required:
        value = str(details.get(key) or '').strip()
        if not value:
            missing.append(_DESTINATION_LABELS.get(key, key))
        else:
            cleaned[key] = value
    if missing:
        raise ValueError(f'Please provide your {", ".join(missing)}.')

    if payment_method == 'upi' and '@' not in cleaned['upiId']:
        raise ValueError('Enter a valid UPI ID (for example name@bank).')
    if payment_method == 'bank_transfer' and not cleaned['accountNumber'].isdigit():
        raise ValueError('Account number must contain digits only.')

    parts = [f'{_REFERENCE_LABELS.get(k, k)}: {v}' for k, v in cleaned.items()]
    # reference_number is a 255-char column; keep well inside it.
    return ' | '.join(parts)[:255]


def create_withdrawal(
    user_id: int,
    amount: float,
    payment_method: str,
    destination: dict | None = None,
) -> dict:
    """Player action: request a payout of real money.

    Only the real balance is withdrawable. `available` is main_balance minus
    existing holds and never includes bonus_balance, so a player cannot cash
    out a bonus — bonus money has to be wagered into the real balance first
    (see core.bonus_services).

    ``destination`` carries the method-specific payout details (UPI id, bank
    account, crypto wallet); they are validated and stored on the transaction
    so an admin can actually pay the request out.

    A player may have only one withdrawal awaiting review: a new request is
    refused until the admin approves or rejects the open one.
    """
    _require_player(user_id)
    reference = _format_destination(payment_method, destination)
    wallet_data = get_wallet(user_id)
    # Checked ahead of the balance: the open request's hold has already shrunk
    # `available`, and "insufficient balance" would hide the real reason.
    if wallet_data['hasPendingWithdrawal']:
        raise ValueError(PENDING_WITHDRAWAL_MESSAGE)
    if amount > wallet_data['available']:
        raise ValueError(
            'Insufficient withdrawable balance. Bonus funds must meet their '
            'wagering requirement before they can be withdrawn.'
        )
    if amount < 500:
        raise ValueError('Minimum withdrawal is ₹500')

    with tenant_atomic():
        # Re-check under the wallet row lock so two requests fired together
        # queue here — the second then sees the first's pending row.
        Wallet.objects.select_for_update().get(user_id=user_id)
        if _has_open_withdrawal(user_id):
            raise ValueError(PENDING_WITHDRAWAL_MESSAGE)
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.WITHDRAWAL,
            amount=Decimal(str(amount)),
            status=Transaction.Status.PENDING,
            payment_method=payment_method,
            reference_number=reference,
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


def list_game_categories() -> list[dict]:
    """Active catalog verticals for the public site nav//filters, in display order."""
    from core.models import GameCategory

    return [
        {
            'id': c.id,
            'name': c.name,
            'slug': c.slug,
            'icon_url': c.icon_url,
            'is_sports': c.is_sports,
            'sort_order': c.sort_order,
        }
        for c in GameCategory.objects.filter(is_active=True).order_by('sort_order', 'name')
    ]


def list_games(
    category: str | None = None,
    featured: bool | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
):
    qs = Game.objects.filter(is_active_web=True, is_active=True).select_related(
        'provider', 'category_ref'
    )
    # Hide games whose provider has been disabled in the admin panel. Games
    # without a provider (provider_id NULL) stay visible.
    qs = qs.filter(Q(provider__isnull=True) | Q(provider__is_active=True))
    if category:
        # Match on the mirrored slug so a client can pass either the slug it has
        # always used or a newly added one, and hide games whose category the
        # admin has deactivated.
        qs = qs.filter(category=category)
    qs = qs.filter(Q(category_ref__isnull=True) | Q(category_ref__is_active=True))
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
            # `category` stays the slug the site has always filtered on;
            # `category_name` is the admin-set display label, additive so no
            # existing theme has to change.
            'category': g.category,
            'category_name': g.category_ref.name if g.category_ref else None,
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
            # The vendor's logo, set per provider in the admin. Additive: themes
            # that render a text circle ignore it, and a provider without one
            # falls back to its name rather than an empty tile.
            'provider_logo_url': g.provider.logo_url if g.provider else None,
        }
        for g in qs
    ]


def get_game_by_slug(slug: str):
    """One playable game by slug, or None.

    The play page used to find its game by scanning the paginated catalog the
    client had already downloaded, so any game outside that page (the catalog is
    capped, and there are far more games than the cap) resolved to "Game not
    found" and could never be opened. Resolving server-side makes every active
    game reachable by URL no matter how large the catalog grows.

    Visibility matches :func:`list_games` exactly — same active/provider/category
    rules — so a game hidden from the catalog cannot be opened by guessing its
    URL.
    """
    if not slug:
        return None
    game = (
        # Accept a game_uid as well as a slug: a game with no slug is opened by
        # uid, and the two namespaces cannot collide.
        Game.objects.filter(Q(slug=slug) | Q(game_uid=slug))
        .filter(is_active_web=True, is_active=True)
        .filter(Q(provider__isnull=True) | Q(provider__is_active=True))
        .filter(Q(category_ref__isnull=True) | Q(category_ref__is_active=True))
        .select_related('provider', 'category_ref')
        .first()
    )
    if not game:
        return None
    return {
        'id': game.id,
        'name': game.name,
        'slug': game.slug,
        'category': game.category,
        'category_name': game.category_ref.name if game.category_ref else None,
        'game_uid': game.game_uid,
        'game_type': game.game_type,
        'thumbnail_url': game.thumbnail_url,
        'rtp': float(game.rtp) if game.rtp else None,
        'min_bet': float(game.min_bet),
        'max_bet': float(game.max_bet),
        'is_featured': game.is_featured,
        'is_provably_fair': game.is_provably_fair,
        'play_count': game.play_count,
        'provider_name': game.provider.name if game.provider else None,
        'provider_slug': game.provider.slug if game.provider else None,
    }


def list_deposit_methods() -> list[dict]:
    """Deposit methods a player can pay into, with the destination account.

    The deposit page asked for a payment but showed a hardcoded method list and
    no account details, so a player following UPI/bank-transfer instructions had
    nowhere to send the money. These rows are admin-managed (Backoffice →
    Payment methods); only deposit-capable active ones are returned.
    """
    from core.backoffice_models import PaymentMethod

    methods = PaymentMethod.objects.filter(
        is_active=True, supports_deposit=True
    ).order_by('sort_order', 'name')
    return [
        {
            'id': m.id,
            'name': m.name,
            'code': m.code,
            'method_type': m.method_type,
            'logo_url': m.logo_url,
            'min_amount': float(m.min_amount or 0),
            'max_amount': float(m.max_amount) if m.max_amount is not None else None,
            # Where the player sends the money. Only the fields for the
            # method's type are populated (backoffice_reports.DESTINATION_FIELDS);
            # the deposit page renders the block that matches method_type.
            'account_name': m.account_name,
            'account_number': m.account_number,
            'ifsc_code': m.ifsc_code,
            'bank_name': m.bank_name,
            'branch_name': m.branch_name,
            'upi_id': m.upi_id,
            'qr_image_url': m.qr_image_url,
            'crypto_network': m.crypto_network,
            'wallet_address': m.wallet_address,
            'instructions': m.instructions,
        }
        for m in methods
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


def list_active_promotion_posters():
    """Active offer posters for the public /promotions page, in display order.
    Separate from bonus catalogue rows at GET /promotions."""
    return [
        {
            'id': p.id,
            'title': p.title,
            'image_url': p.image_url,
            'link_url': p.link_url,
        }
        for p in PromotionPoster.objects.filter(status='active').order_by('sort_order', 'id')
    ]


def list_active_faqs():
    """Public home-page FAQs the product admin has set to active, in display
    order. Returns [] when none are configured."""
    return [
        {
            'id': f.id,
            'question': f.question,
            'answer': f.answer,
        }
        for f in Faq.objects.filter(status='active').order_by('sort_order', 'id')
    ]


def place_bet(user_id: int, game_id: int, amount: float, odds: float | None = None) -> dict:
    """Stake on a game, spending bonus credit before real money.

    Bonus money is stakeable — that is how a player works off the wagering
    requirement — so it counts toward the available balance here. Drawing it
    down first keeps the withdrawable real balance intact for as long as
    possible.
    """
    stake = Decimal(str(amount))
    with tenant_atomic():
        wallet = Wallet.objects.select_for_update().get(user_id=user_id)
        available = wallet.main_balance + wallet.bonus_balance - wallet.locked_balance
        if available < stake:
            raise ValueError('Insufficient balance')
        bet = Bet.objects.create(
            user_id=user_id,
            game_id=game_id,
            bet_amount=stake,
            odds=Decimal(str(odds)) if odds else None,
        )
        from_bonus = min(stake, max(wallet.bonus_balance, Decimal('0')))
        wallet.bonus_balance -= from_bonus
        wallet.main_balance -= (stake - from_bonus)
        wallet.save(update_fields=['main_balance', 'bonus_balance', 'updated_at'])
        Game.objects.filter(id=game_id).update(play_count=F('play_count') + 1)

    # Turnover counts toward any active bonus's wagering target.
    try:
        bonus_services.record_wagering(user_id, stake)
    except Exception:
        pass
    return {'betId': bet.id, 'status': 'open'}


def get_dashboard_stats() -> dict:
    now = timezone.now()
    today = now.date()
    yesterday = today - timedelta(days=1)
    users_qs = _player_users()
    # Same day the Deposits/Withdrawals pages use: an IST calendar day on
    # created_at (see _apply_cashier_date_range). A plain __date lookup runs
    # in settings.TIME_ZONE (UTC), which drops anything raised between 00:00
    # and 05:30 IST onto the previous day, and updated_at is auto_now so a
    # later save would move the row onto a different day. Counting completed
    # rows in this window makes "Today: Sum of Deposits" equal the Approved
    # sum when that page's Created filter is today.
    #
    # A manual wallet adjustment (see wallet_adjustment()) is stored as
    # type=adjustment rather than deposit/withdrawal, but it credits or debits
    # real balance just the same, and the Deposits/Withdrawals console pages
    # already fold it in by the sign of the amount (see _cashier_type_filter
    # in admin_services.py). Adjustment rows are signed (debit negative), so
    # amounts are summed by magnitude.
    ist_today = now.astimezone(IST).date()
    ist_start = datetime.combine(ist_today, time.min, tzinfo=IST)
    ist_end = datetime.combine(ist_today + timedelta(days=1), time.min, tzinfo=IST)
    deposit_type_filter = Q(type=Transaction.TxType.DEPOSIT) | Q(
        type=Transaction.TxType.ADJUSTMENT, amount__gte=0
    )
    withdrawal_type_filter = Q(type=Transaction.TxType.WITHDRAWAL) | Q(
        type=Transaction.TxType.ADJUSTMENT, amount__lt=0
    )
    deposits_today = Transaction.objects.filter(
        deposit_type_filter,
        status=Transaction.Status.COMPLETED,
        created_at__gte=ist_start,
        created_at__lt=ist_end,
    ).aggregate(
        total=Sum(Abs('amount')),
        count=Count('id'),
        players=Count('user_id', distinct=True),
    )
    withdrawals_today = Transaction.objects.filter(
        withdrawal_type_filter,
        status=Transaction.Status.COMPLETED,
        created_at__gte=ist_start,
        created_at__lt=ist_end,
    ).aggregate(
        completed=Sum(Abs('amount')),
        count=Count('id'),
        players=Count('user_id', distinct=True),
    )
    # Separate from the above: withdrawals still awaiting review that were
    # *requested* today — there's no completion date to bucket them by yet.
    withdrawals_pending_today = Transaction.objects.filter(
        type=Transaction.TxType.WITHDRAWAL,
        status=Transaction.Status.PENDING,
        created_at__gte=ist_start,
        created_at__lt=ist_end,
    ).count()
    # Sum of every player's wallet balance — real + bonus, matching
    # get_wallet()'s `total` (main_balance + bonus_balance). The queryset is
    # restricted to real player accounts so agent/affiliate/admin and demo
    # wallets never leak in.
    liability = Wallet.objects.filter(user__in=users_qs).aggregate(
        total=Sum(F('main_balance') + F('bonus_balance'))
    )
    active = users_qs.filter(
        last_login_at__gte=now - timedelta(minutes=15)
    ).count()
    active_last_hour = users_qs.filter(
        last_login_at__gte=now - timedelta(hours=1)
    ).count()
    # Players who have ever made at least one completed deposit.
    depositing_players = (
        Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            status=Transaction.Status.COMPLETED,
        )
        .values('user_id')
        .distinct()
        .count()
    )
    return {
        'totalUsers': users_qs.count(),
        'signupsToday': users_qs.filter(created_at__date=today).count(),
        'signupsYesterday': users_qs.filter(created_at__date=yesterday).count(),
        'activePlayers': active,
        'activePlayersLastHour': active_last_hour,
        'depositingPlayers': depositing_players,
        'depositsToday': {
            'amount': float(deposits_today['total'] or 0),
            'count': deposits_today['count'] or 0,
            'players': deposits_today['players'] or 0,
        },
        'withdrawalsToday': {
            'amount': float(withdrawals_today['completed'] or 0),
            'count': withdrawals_today['count'] or 0,
            'pending': withdrawals_pending_today,
            'players': withdrawals_today['players'] or 0,
        },
        'totalLiability': float(liability['total'] or 0),
    }


def admin_create_user(
    full_name: str,
    phone: str,
    password: str,
    country_code: str = 'IN',
    initial_balance: float = 0,
    state: str | None = None,
    signup_ip: str | None = None,
    created_by: int | None = None,
) -> dict:
    full_name = (full_name or '').strip()
    phone = (phone or '').strip()
    if not full_name:
        raise ValueError('Full name is required')
    if not phone:
        raise ValueError('Phone number is required')
    if not password or len(password) < 6:
        raise ValueError('Password must be at least 6 characters')
    if User.objects.filter(phone=phone, role=User.Role.USER).exists():
        raise ValueError('Phone number already registered')

    password_hash = _hash_password(password)
    voice_id = f'AI_EXEC_{random.randint(1, 50):03d}'
    # Same all-or-nothing rule as the player sign-up in register_user: the admin
    # either gets a complete account or none at all.
    with tenant_atomic():
        for _attempt in range(5):
            try:
                with tenant_atomic():
                    user = User.objects.create(
                        username=_next_sequential_username(full_name),
                        phone=phone,
                        full_name=full_name,
                        state=state,
                        signup_ip=signup_ip,
                        created_by=created_by,
                        country_code=country_code,
                        role=User.Role.USER,
                        password_hash=password_hash,
                    )
                break
            except IntegrityError:
                continue
        else:
            raise ValueError('Could not allocate a username, please try again')

        balance = Decimal(str(initial_balance or 0))
        if balance < 0:
            balance = Decimal('0')
        Wallet.objects.create(user=user, main_balance=balance)
        _create_user_settings(
            user,
            registration_path=UserSetting.RegistrationPath.DIRECT,
            phone_verified=True,
            ai_voice_executive_id=voice_id,
            referral_code=bonus_services._generate_referral_code(),
        )
    return {
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'phone': user.phone,
        'account_status': user.account_status,
        'main_balance': float(balance),
    }


def _optional_int(value):
    """Parse a query value as int. None when blank, False when it is not a number."""
    if value is None or str(value).strip() == '':
        return None
    try:
        return int(str(value).strip())
    except ValueError:
        return False


def _optional_date(value):
    if not value or not str(value).strip():
        return None
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def list_users(
    status: str | None = None,
    limit: int | None = 50,
    offset: int = 0,
    *,
    search: str | None = None,
    user_id=None,
    affiliate_id=None,
    username: str | None = None,
    full_name: str | None = None,
    phone: str | None = None,
    ip: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    """Player accounts for the admin Users page.

    ``limit=None`` returns every match. Search and the filter-panel fields are
    applied in the query, so an older account is found even when it would have
    fallen outside a page of the newest rows.
    """
    qs = _player_users().select_related('wallet', 'usersetting')
    if status:
        qs = qs.filter(account_status=status)

    term = (search or '').strip()
    if term:
        match = (
            Q(username__icontains=term)
            | Q(full_name__icontains=term)
            | Q(phone__icontains=term)
            | Q(signup_ip__icontains=term)
        )
        member_id = _optional_int(term)
        if isinstance(member_id, int):
            match |= Q(id=member_id)
        qs = qs.filter(match)

    member_id = _optional_int(user_id)
    if member_id is False:
        qs = qs.none()
    elif member_id is not None:
        qs = qs.filter(id=member_id)

    referred_by = _optional_int(affiliate_id)
    if referred_by is False:
        qs = qs.none()
    elif referred_by is not None:
        qs = qs.filter(usersetting__affiliate_id=referred_by)

    if username and username.strip():
        qs = qs.filter(username__icontains=username.strip())
    if full_name and full_name.strip():
        qs = qs.filter(full_name__icontains=full_name.strip())
    if phone and phone.strip():
        qs = qs.filter(phone__icontains=phone.strip())
    if ip and ip.strip():
        qs = qs.filter(signup_ip__icontains=ip.strip())

    start = _optional_date(date_from)
    end = _optional_date(date_to)
    if start:
        qs = qs.filter(created_at__date__gte=start)
    if end:
        qs = qs.filter(created_at__date__lte=end)

    ordered = qs.order_by('-created_at')
    offset = max(0, offset)
    if limit is None:
        qs = list(ordered[offset:])
    else:
        qs = list(ordered[offset : offset + max(0, limit)])

    # Resolve agent / affiliate display names in bulk so the listing stays at a
    # fixed number of queries regardless of page size.
    agent_ids = set()
    affiliate_ids = set()
    for u in qs:
        prefs = get_user_settings(u)
        if prefs and prefs.agent_id:
            agent_ids.add(prefs.agent_id)
        if prefs and prefs.affiliate_id:
            affiliate_ids.add(prefs.affiliate_id)
    agent_names: dict = {}
    affiliate_names: dict = {}
    if agent_ids:
        from core.agent_models import Agent

        agent_names = dict(
            Agent.objects.filter(id__in=agent_ids).values_list('id', 'name')
        )
    if affiliate_ids:
        from core.affiliate_models import Affiliate

        affiliate_names = dict(
            Affiliate.objects.filter(id__in=affiliate_ids).values_list('id', 'name')
        )

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
            'country_code': u.country_code,
            'state': u.state,
            'ip': u.signup_ip,
            'created_by': u.created_by,
            # NULL created_by means the player signed up themselves; any id
            # means a staff/agent account created the account for them.
            'created_by_type': (
                'self_registered' if u.created_by is None else 'admin_registered'
            ),
            'affiliate_id': prefs.affiliate_id if prefs else None,
            'agent_id': prefs.agent_id if prefs else None,
            'agent_name': agent_names.get(prefs.agent_id) if prefs else None,
            'affiliate_name': affiliate_names.get(prefs.affiliate_id) if prefs else None,
            'account_status': u.account_status,
            'created_at': u.created_at.isoformat(),
            'last_login_at': u.last_login_at.isoformat() if u.last_login_at else None,
            'main_balance': float(w.main_balance) if w else 0,
            'bonus_balance': float(w.bonus_balance) if w else 0,
        })
    return result
