import random
import secrets
import string
from datetime import timedelta
from decimal import Decimal

import bcrypt
from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from core.auth_jwt import sign_token
from core.models import (
    Bet,
    Game,
    OtpVerification,
    Transaction,
    User,
    UserSetting,
    Wallet,
    WithdrawalStage,
)
from tenants.state import get_current_tenant_slug, tenant_atomic


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


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
    return {'sent': True, 'expiresIn': settings.OTP_EXPIRY_MINUTES * 60}


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


def register_with_otp(full_name: str, phone: str, country_code: str = 'IN') -> dict:
    username = f'user_{phone[-6:]}_{secrets.token_hex(4)}'
    voice_id = f'AI_EXEC_{random.randint(1, 50):03d}'
    user = User.objects.create(
        username=username,
        phone=phone,
        full_name=full_name,
        country_code=country_code,
        role=User.Role.USER,
    )
    Wallet.objects.create(
        user=user,
        bonus_balance=Decimal(str(settings.WELCOME_BONUS)),
    )
    _create_user_settings(
        user,
        registration_path=UserSetting.RegistrationPath.OTP,
        phone_verified=True,
        ai_voice_executive_id=voice_id,
    )
    token = sign_token({'sub': user.id, 'role': User.Role.USER}, tenant=get_current_tenant_slug())
    return {
        'userId': user.id,
        'username': username,
        'token': token,
        'welcomeBonus': settings.WELCOME_BONUS,
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
    token = sign_token(
        {'sub': user.id, 'role': User.Role.USER, 'type': 'demo'},
        tenant=get_current_tenant_slug(),
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
    return {'token': sign_token(payload, tenant=get_current_tenant_slug()), 'userId': user.id}


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
        'token': sign_token({'sub': admin.id, 'role': admin.role}, tenant=get_current_tenant_slug()),
        'role': admin.role,
    }


def get_wallet(user_id: int) -> dict:
    wallet = Wallet.objects.get(user_id=user_id)
    main = float(wallet.main_balance)
    locked = float(wallet.locked_balance)
    return {
        'main': main,
        'bonus': float(wallet.bonus_balance),
        'exposure': float(wallet.exposure_balance),
        'locked': locked,
        'currency': wallet.currency,
        'available': main - locked,
    }


def create_deposit(user_id: int, amount: float, payment_method: str, currency: str = 'INR') -> dict:
    tx = Transaction.objects.create(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        amount=Decimal(str(amount)),
        currency=currency,
        status=Transaction.Status.PENDING,
        payment_method=payment_method,
    )
    return {'transactionId': tx.id, 'status': 'pending'}


def confirm_deposit(transaction_id: int, reference_number: str) -> dict:
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id, type=Transaction.TxType.DEPOSIT
        )
        amount = tx.amount
        tx.status = Transaction.Status.COMPLETED
        tx.reference_number = reference_number
        tx.save(update_fields=['status', 'reference_number', 'updated_at'])
        Wallet.objects.filter(user_id=tx.user_id).update(
            main_balance=F('main_balance') + amount
        )
    return {'credited': float(amount)}


def create_withdrawal(user_id: int, amount: float, payment_method: str) -> dict:
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

    process_withdrawal_stages(tx.id)
    return {'transactionId': tx.id, 'status': 'pending'}


def process_withdrawal_stages(transaction_id: int) -> dict:
    auto_approve = True
    status = 'passed' if auto_approve else 'review'
    WithdrawalStage.objects.filter(transaction_id=transaction_id).update(status=status)
    if auto_approve:
        Transaction.objects.filter(id=transaction_id).update(
            status=Transaction.Status.PROCESSING
        )
    return {'autoApproved': auto_approve}


def list_games(
    category: str | None = None,
    featured: bool | None = None,
    limit: int = 50,
    offset: int = 0,
):
    qs = Game.objects.filter(is_active_web=True, is_active=True).select_related('provider')
    if category:
        qs = qs.filter(category=category)
    if featured:
        qs = qs.filter(is_featured=True)
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
