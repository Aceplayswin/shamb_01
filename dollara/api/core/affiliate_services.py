"""Business logic for the affiliate portal.

Layering matches the rest of this codebase: views are thin adapters that pull
query params, call one function here, and wrap the result in ``JsonResponse``.
Failures are raised as ``ValueError`` with a message meant for a human, which
the view turns into ``{'error': ...}``.

Two functions here are called from *outside* the affiliate module and are the
only places the player flow touches this feature:

* :func:`attribute_signup` — from ``services.register_user``, links a new player
  to the affiliate who referred them;
* :func:`record_deposit` — from ``services.confirm_deposit``, stamps the first
  deposit and accumulates lifetime totals.

Both are called inside a ``try/except`` on the caller's side and are written to
be safe to call twice, because the alternative — an attribution bug rolling back
a player's account or a credited deposit — is far worse than a missed referral.
"""

from __future__ import annotations

import json
import logging
import secrets
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings as django_settings
from django.db import IntegrityError
from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from core.affiliate_auth import (new_totp_secret, totp_uri, verify_totp)
from core.affiliate_models import (Affiliate, AffiliateApiKey, AffiliateApiLog,
                                   AffiliateAuditLog, AffiliateClick,
                                   AffiliateCommissionLedger, AffiliateCreative,
                                   AffiliateFraudFlag, AffiliateKycDocument,
                                   AffiliateLink, AffiliateLoginChallenge,
                                   AffiliatePayout, AffiliatePayoutMethod,
                                   AffiliateReferral, AffiliateSupportTicket,
                                   AffiliateTicketMessage, Notification)
from core.auth_jwt import sign_token
from core.models import GameRound, PlatformSetting, User, UserSetting
from core.services import _check_password, hash_password
from tenants.state import get_current_tenant_id, tenant_atomic

logger = logging.getLogger('affiliate')

ZERO = Decimal('0.00')
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
SETTINGS_KEY = 'affiliate_program'

# Fallbacks used only when the platform_settings row is missing entirely (a DB
# that predates the migration). Amounts are INR.
DEFAULT_PROGRAM_SETTINGS = {
    'default_commission_type': 'revenue_share',
    'default_commission_rate': 30,
    'default_cpa_amount': 500,
    'default_override_rate': 5,
    'default_hybrid_cpa_days': 30,
    'cpa_min_deposit': 500,
    'cookie_window_days': 30,
    'attribution_model': 'last_click',
    'min_payout_threshold': 5000,
    'payout_cycle': 'monthly',
    'auto_approve_days': 7,
    'max_override_depth': 3,
    'deduct_bonus_from_ngr': True,
    'negative_ngr_carry_forward': True,
    'fraud_max_referrals_per_ip': 5,
    'fraud_block_disposable_emails': True,
    'fraud_flag_self_referral': True,
    'click_retention_days': 180,
    'currency': 'INR',
}

DISPOSABLE_EMAIL_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'trashmail.com', 'yopmail.com', 'throwawaymail.com', 'sharklasers.com',
    'getnada.com', 'dispostable.com', 'maildrop.cc', 'temp-mail.org',
}

LANDING_PAGES = [
    {'value': '/', 'label': 'Homepage'},
    {'value': '/register', 'label': 'Registration'},
    {'value': '/promotions', 'label': 'Promotions'},
    {'value': '/games', 'label': 'Game lobby'},
    {'value': '/bonus', 'label': 'Bonuses'},
    {'value': '/deposit', 'label': 'Deposit'},
]


# ---------------------------------------------------------------------------
# Settings, money and formatting helpers
# ---------------------------------------------------------------------------

def get_program_settings() -> dict:
    """Program-wide configuration, merged over the defaults above.

    Stored as one JSON row in ``platform_settings`` rather than its own table:
    the admin console's existing settings endpoints then manage it for free.
    """
    merged = dict(DEFAULT_PROGRAM_SETTINGS)
    row = PlatformSetting.objects.filter(setting_key=SETTINGS_KEY).first()
    if row and row.setting_value:
        value = row.setting_value
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (TypeError, ValueError):
                value = {}
        if isinstance(value, dict):
            merged.update(value)
    return merged


def save_program_settings(values: dict) -> dict:
    """Merge ``values`` over the stored settings. Unknown keys are dropped so a
    stray field from an older client cannot poison the config."""
    current = get_program_settings()
    for key in DEFAULT_PROGRAM_SETTINGS:
        if key in values and values[key] is not None:
            current[key] = values[key]
    PlatformSetting.objects.update_or_create(
        setting_key=SETTINGS_KEY, defaults={'setting_value': current}
    )
    return current


def money(value) -> Decimal:
    """Coerce to a 2dp Decimal. Never construct one from a float directly."""
    return Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def f(value) -> float:
    """Serialize a Decimal for JSON.

    The house convention. Loses precision past 2^53, which INR amounts at this
    scale will not reach.
    """
    return float(value or 0)


def inr(value) -> str:
    """Server-formatted money, for labels the client shows verbatim."""
    return f'₹{Decimal(str(value or 0)):,.2f}'.replace('.00', '')


def _rate_or_default(affiliate_value, default_value) -> Decimal:
    """Per-affiliate override, falling back to the program default.

    Zero means "inherit" throughout this module — that is what makes the admin
    Global Settings screen actually govern anything.
    """
    value = money(affiliate_value)
    return value if value > ZERO else money(default_value)


def commission_rate_for(affiliate: Affiliate, settings: dict | None = None) -> Decimal:
    settings = settings or get_program_settings()
    return _rate_or_default(affiliate.commission_rate,
                            settings['default_commission_rate'])


def cpa_amount_for(affiliate: Affiliate, settings: dict | None = None) -> Decimal:
    settings = settings or get_program_settings()
    return _rate_or_default(affiliate.cpa_amount, settings['default_cpa_amount'])


def override_rate_for(affiliate: Affiliate, settings: dict | None = None) -> Decimal:
    settings = settings or get_program_settings()
    return _rate_or_default(affiliate.override_rate,
                            settings['default_override_rate'])


def payout_threshold_for(affiliate: Affiliate, settings: dict | None = None) -> Decimal:
    settings = settings or get_program_settings()
    return _rate_or_default(affiliate.payout_threshold,
                            settings['min_payout_threshold'])


def _iso(value):
    return value.isoformat() if value else None


def _generate_code(prefix: str = 'DLR-', length: int = 6) -> str:
    """A collision-checked affiliate code.

    Deliberately a different namespace from ``user_settings.referral_code``
    (player-to-player referrals). The two must never be resolved against each
    other, or a player's share code would silently pay an affiliate.
    """
    for _ in range(10):
        code = prefix + ''.join(secrets.choice(CODE_ALPHABET) for _ in range(length))
        if not Affiliate.objects.filter(code=code).exists():
            return code
    return prefix + ''.join(secrets.choice(CODE_ALPHABET) for _ in range(length + 3))


def _generate_link_code() -> str:
    for _ in range(10):
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(9))
        if not AffiliateLink.objects.filter(code=code).exists():
            return code
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(12))


def client_ip(request) -> str:
    """The caller's IP, honouring the proxy header. Same idiom as ``geo_detect``."""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    return ip or request.META.get('REMOTE_ADDR', '') or ''


def api_base_url() -> str:
    return (django_settings.API_URL or 'http://localhost:5000').rstrip('/')


def web_base_url() -> str:
    return (django_settings.WEB_URL or 'http://localhost:3000').rstrip('/')


def affiliate_portal_url() -> str:
    return (django_settings.AFFILIATE_URL or 'http://localhost:3003').rstrip('/')


def tracking_url(code: str) -> str:
    return f'{api_base_url()}/r/{code}'


def audit(affiliate_id, actor_type, action, *, actor_id=None, actor_label=None,
          target=None, before=None, after=None, ip=None) -> None:
    """Write an audit row. Never raises — an audit failure must not undo the
    action that was being audited."""
    try:
        AffiliateAuditLog.objects.create(
            affiliate_id=affiliate_id, actor_type=actor_type, actor_id=actor_id,
            actor_label=actor_label, action=action, target=target,
            before_value=before, after_value=after, ip_address=ip,
        )
    except Exception:
        logger.exception('affiliate audit write failed: %s', action)


def notify(affiliate_id: int, type_: str, title: str, message: str,
           metadata: dict | None = None) -> None:
    """Queue an in-app notification. Best-effort, same reasoning as ``audit``."""
    try:
        Notification.objects.create(
            affiliate_id=affiliate_id, type=type_, title=title,
            message=message, metadata=metadata,
        )
    except Exception:
        logger.exception('affiliate notification write failed: %s', type_)


# ---------------------------------------------------------------------------
# Serializers
#
# Hand-written dicts, matching the rest of this codebase (there are no DRF
# serializers anywhere in the product). Keys are snake_case; money is a number,
# never a pre-formatted string, so the client owns presentation.
# ---------------------------------------------------------------------------

def serialize_affiliate(affiliate: Affiliate, settings: dict | None = None) -> dict:
    """The identity object. Drives the portal's whole session — every screen
    that used to hardcode a partner code reads it from here."""
    settings = settings or get_program_settings()
    parent = affiliate.parent
    return {
        'id': affiliate.id,
        'code': affiliate.code,
        'name': affiliate.name,
        'company_name': affiliate.company_name,
        'email': affiliate.email,
        'phone': affiliate.phone,
        'status': affiliate.status,
        'tier_label': affiliate.tier_label,
        'commission_tier': affiliate.commission_tier,
        'commission_type': affiliate.commission_type,
        'commission_rate': f(commission_rate_for(affiliate, settings)),
        'cpa_amount': f(cpa_amount_for(affiliate, settings)),
        'override_rate': f(override_rate_for(affiliate, settings)),
        'parent_affiliate_id': affiliate.parent_id,
        'parent_name': parent.name if parent else None,
        'kyc_status': affiliate.kyc_status,
        'two_factor_enabled': affiliate.two_factor_enabled,
        'onboarding_complete': affiliate.onboarding_complete,
        'terms_accepted_at': _iso(affiliate.terms_accepted_at),
        'currency': affiliate.currency or settings['currency'],
        'timezone': affiliate.timezone,
        'notification_prefs': affiliate.notification_prefs or {},
        'payout_threshold': f(payout_threshold_for(affiliate, settings)),
        'webhook_url': affiliate.webhook_url,
        # Everything the client needs to build a link itself, so no frontend
        # ever hardcodes a host again.
        'tracking_base_url': f'{api_base_url()}/r/',
        'web_url': web_base_url(),
        'joined_at': _iso(affiliate.created_at),
        'last_login_at': _iso(affiliate.last_login_at),
    }


def serialize_link(link: AffiliateLink, stats: dict | None = None) -> dict:
    stats = stats or {}
    return {
        'id': link.id,
        'code': link.code,
        'name': link.name,
        'sub_id': link.sub_id,
        'target_path': link.target_path,
        'is_active': link.is_active,
        'tracking_url': tracking_url(link.code),
        'clicks': link.clicks_count,
        'signups': stats.get('signups', 0),
        'ftds': stats.get('ftds', 0),
        'commission': f(stats.get('commission', 0)),
        'created_at': _iso(link.created_at),
    }


def serialize_referral(referral: AffiliateReferral, *, link_names=None) -> dict:
    """A referred player, aggregated.

    Note what is absent: no phone, no email, no full name. An affiliate is paid
    on a player's activity, which does not require handing them that player's
    contact details.
    """
    link_names = link_names or {}
    prefs = getattr(referral, '_prefs', None)
    return {
        'id': referral.id,
        'user_id': referral.user_id,
        'player_ref': f'P-{referral.user_id:05d}',
        'signed_up_at': _iso(referral.attributed_at or referral.created_at),
        'kyc_status': prefs.kyc_status if prefs else 'none',
        'ftd_at': _iso(referral.first_deposit_at),
        'ftd_amount': f(referral.first_deposit_amount),
        'deposit_count': referral.deposit_count,
        'lifetime_deposits': f(referral.lifetime_deposits),
        'lifetime_ngr': f(referral.lifetime_ngr),
        'lifetime_commission': f(referral.lifetime_commission),
        'status': referral.status,
        'country_code': getattr(referral, '_country_code', None),
        'last_active_at': _iso(referral.last_active_at),
        'source_link_name': link_names.get(referral.link_id),
        'sub_id': referral.sub_id,
    }


_BASE_LABELS = {
    'ngr': 'NGR',
    'ftd': 'First deposit',
    'network_commission': 'Network commission',
    'manual': 'Manual',
}


def serialize_ledger_entry(entry: AffiliateCommissionLedger,
                           source_names: dict | None = None) -> dict:
    source_names = source_names or {}
    return {
        'id': entry.id,
        'entry_type': entry.entry_type,
        'base_kind': entry.base_kind,
        'base_amount': f(entry.base_amount),
        # A label rather than the client re-deriving one: the server knows
        # whether the base is NGR or an FTD, and the currency.
        'base_label': f'{_BASE_LABELS.get(entry.base_kind, entry.base_kind)}: '
                      f'{inr(entry.base_amount)}',
        'rate': f(entry.rate),
        'amount': f(entry.amount),
        'currency': entry.currency,
        'status': entry.status,
        'period_start': entry.period_start.isoformat() if entry.period_start else None,
        'period_end': entry.period_end.isoformat() if entry.period_end else None,
        'referral_id': entry.referral_id,
        'source_affiliate_id': entry.source_affiliate_id,
        'source_affiliate_name': source_names.get(entry.source_affiliate_id),
        'payout_id': entry.payout_id,
        'notes': entry.notes,
        'created_at': _iso(entry.created_at),
    }


def serialize_payout(payout: AffiliatePayout, entry_count: int = 0) -> dict:
    return {
        'id': payout.id,
        'amount': f(payout.amount),
        'currency': payout.currency,
        'status': payout.status,
        'method_id': payout.method_id,
        'method_label': payout.method_label,
        'method_details': payout.method_details,
        'reference': payout.reference,
        'rejection_reason': payout.rejection_reason,
        'requested_at': _iso(payout.requested_at or payout.created_at),
        'processed_at': _iso(payout.processed_at),
        'entry_count': entry_count,
    }


def serialize_payout_method(method: AffiliatePayoutMethod) -> dict:
    return {
        'id': method.id,
        'method_type': method.method_type,
        'label': method.label,
        # `details` is never returned in full: it holds account numbers, and a
        # list view has no need for them.
        'masked_details': method.masked_details,
        'is_primary': method.is_primary,
        'is_verified': method.is_verified,
        'created_at': _iso(method.created_at),
    }


def serialize_notification(row: Notification) -> dict:
    return {
        'id': row.id,
        'type': row.type,
        'title': row.title,
        'message': row.message,
        'is_read': row.is_read,
        'metadata': row.metadata or {},
        'created_at': _iso(row.created_at),
    }


def serialize_api_key(key: AffiliateApiKey) -> dict:
    return {
        'id': key.id,
        'key_id': key.key_id,
        'fingerprint': key.fingerprint,
        'status': key.status,
        'public_pem': key.public_pem,
        'grace_until': _iso(key.grace_until),
        'last_used_at': _iso(key.last_used_at),
        'created_at': _iso(key.created_at),
        'revoked_at': _iso(key.revoked_at),
    }


def serialize_creative(creative: AffiliateCreative) -> dict:
    return {
        'id': creative.id,
        'title': creative.title,
        'asset_type': creative.asset_type,
        'file_url': creative.file_url,
        'thumbnail_url': creative.thumbnail_url or creative.file_url,
        'dimensions': creative.dimensions,
        'size_label': creative.size_label,
    }


def serialize_ticket(ticket: AffiliateSupportTicket, message_count: int = 0) -> dict:
    return {
        'id': ticket.id,
        'subject': ticket.subject,
        'category': ticket.category,
        'priority': ticket.priority,
        'status': ticket.status,
        'message_count': message_count,
        'created_at': _iso(ticket.created_at),
        'updated_at': _iso(ticket.updated_at),
    }


def serialize_kyc_document(doc: AffiliateKycDocument) -> dict:
    return {
        'id': doc.id,
        'document_type': doc.document_type,
        'file_url': doc.file_url,
        'original_name': doc.original_name,
        'status': doc.status,
        'rejection_reason': doc.rejection_reason,
        'reviewed_at': _iso(doc.reviewed_at),
        'created_at': _iso(doc.created_at),
    }


# ---------------------------------------------------------------------------
# Public: apply and authenticate
# ---------------------------------------------------------------------------

def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def get_program_overview() -> dict:
    """Public data for the marketing landing page and its earnings calculator.

    The calculator used to run on numbers hardcoded in the page, which drifted
    the moment anyone changed the real commission defaults.
    """
    settings = get_program_settings()
    return {
        'default_commission_type': settings['default_commission_type'],
        'default_commission_rate': f(settings['default_commission_rate']),
        'default_cpa_amount': f(settings['default_cpa_amount']),
        'default_override_rate': f(settings['default_override_rate']),
        'cookie_window_days': settings['cookie_window_days'],
        'min_payout_threshold': f(settings['min_payout_threshold']),
        'payout_cycle': settings['payout_cycle'],
        'currency': settings['currency'],
    }


def apply_as_affiliate(*, full_name, email, password, phone=None, company_name=None,
                       traffic_source=None, expected_volume=None,
                       payment_preference=None, notes=None,
                       parent_affiliate_code=None, override_rate=None,
                       ip=None) -> dict:
    """Submit an application. Creates a `pending` affiliate that cannot log in
    to anything until staff approve it."""
    full_name = (full_name or '').strip()
    email = _normalize_email(email)
    if not full_name:
        raise ValueError('Full name is required')
    if not email or '@' not in email:
        raise ValueError('A valid email address is required')
    if not password or len(password) < 8:
        raise ValueError('Password must be at least 8 characters')
    if Affiliate.objects.filter(email=email).exists():
        raise ValueError('An application already exists for this email address')

    parent = None
    if parent_affiliate_code:
        parent = Affiliate.objects.filter(
            code__iexact=parent_affiliate_code.strip(),
            status=Affiliate.Status.APPROVED,
        ).first()
        # An unknown or unapproved referrer downgrades to a direct application
        # rather than rejecting it — the applicant did nothing wrong.
        if not parent:
            logger.info('apply: unknown parent code %s, treating as direct',
                        parent_affiliate_code)

    settings = get_program_settings()
    with tenant_atomic():
        affiliate = Affiliate.objects.create(
            code=_generate_code(),
            name=full_name,
            email=email,
            password_hash=hash_password(password),
            phone=(phone or '').strip() or None,
            company_name=(company_name or '').strip() or None,
            status=Affiliate.Status.PENDING,
            commission_type=settings['default_commission_type'],
            parent=parent,
            # Depth is derived from the parent, never supplied by the applicant.
            commission_tier=(parent.commission_tier + 1) if parent else 1,
            # The invite link proposes an override; staff confirm it on approval.
            override_rate=money(override_rate) if (parent and override_rate) else ZERO,
            traffic_source=traffic_source,
            expected_volume=expected_volume,
            payment_preference=payment_preference,
            application_notes=notes,
            applied_at=timezone.now(),
            currency=settings['currency'],
        )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'application.submitted',
          actor_id=affiliate.id, actor_label=full_name, ip=ip,
          after={'email': email, 'parent_affiliate_id': parent.id if parent else None})
    return {
        'affiliateId': affiliate.id,
        'code': affiliate.code,
        'status': affiliate.status,
        'parentName': parent.name if parent else None,
    }


def application_status(email: str) -> dict:
    """Let an applicant check their own status.

    An unknown address returns the same shape as a known one, so this cannot be
    used to enumerate who has applied.
    """
    affiliate = Affiliate.objects.filter(email=_normalize_email(email)).first()
    if not affiliate:
        return {'status': 'unknown', 'applied_at': None, 'rejection_reason': None}
    return {
        'status': affiliate.status,
        'applied_at': _iso(affiliate.applied_at),
        'rejection_reason': affiliate.rejection_reason,
    }


def _issue_challenge(affiliate: Affiliate, purpose: str, minutes: int = 10) -> str:
    token = secrets.token_urlsafe(32)[:64]
    AffiliateLoginChallenge.objects.create(
        affiliate=affiliate,
        challenge_token=token,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=minutes),
    )
    return token


def _consume_challenge(token: str, purpose: str) -> AffiliateLoginChallenge:
    """Look up a live challenge and count the attempt.

    The attempt counter is why this is a database row instead of a short-lived
    JWT: a stateless token cannot be rate-limited, and a 6-digit code without
    rate limiting is guessable.
    """
    challenge = AffiliateLoginChallenge.objects.filter(
        challenge_token=(token or ''), purpose=purpose, consumed_at__isnull=True
    ).first()
    if not challenge:
        raise ValueError('This session has expired. Please log in again.')
    if challenge.expires_at <= timezone.now():
        raise ValueError('This session has expired. Please log in again.')
    if challenge.attempts >= 5:
        challenge.consumed_at = timezone.now()
        challenge.save(update_fields=['consumed_at'])
        raise ValueError('Too many incorrect attempts. Please log in again.')
    return challenge


def _login_payload(affiliate: Affiliate) -> dict:
    """Mint the session. Role 'affiliate' means `sub` is an affiliates.id, never
    a users.id — the two never collide because no endpoint accepts both."""
    affiliate.last_login_at = timezone.now()
    affiliate.save(update_fields=['last_login_at', 'updated_at'])
    return {
        'token': sign_token({'sub': affiliate.id, 'role': 'affiliate'},
                            tenant=get_current_tenant_id()),
        'affiliateId': affiliate.id,
        'code': affiliate.code,
        'name': affiliate.name,
        'role': 'affiliate',
        'onboardingComplete': affiliate.onboarding_complete,
    }


def login(email: str, password: str, *, ip=None) -> dict:
    """Step one of login. Returns either a session or a 2FA challenge."""
    affiliate = Affiliate.objects.filter(email=_normalize_email(email)).first()
    if not affiliate or not affiliate.password_hash:
        raise ValueError('Invalid credentials')
    if not _check_password(password, affiliate.password_hash):
        raise ValueError('Invalid credentials')

    # Status is checked only after the password, so a wrong password and a
    # pending account are indistinguishable to someone probing addresses.
    if affiliate.status == Affiliate.Status.PENDING:
        raise ValueError('Your application is still under review.')
    if affiliate.status == Affiliate.Status.INFO_REQUESTED:
        raise ValueError('We need more information before approving your application.')
    if affiliate.status == Affiliate.Status.REJECTED:
        raise ValueError('Your application was not approved.')
    if affiliate.status == Affiliate.Status.SUSPENDED or not affiliate.is_active:
        raise ValueError('Your affiliate account has been suspended.')

    if affiliate.two_factor_enabled and affiliate.two_factor_secret:
        return {
            'twoFactorRequired': True,
            'challengeToken': _issue_challenge(affiliate, '2fa'),
        }

    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'auth.login',
          actor_id=affiliate.id, actor_label=affiliate.name, ip=ip)
    return _login_payload(affiliate)


def verify_two_factor(challenge_token: str, code: str, *, ip=None) -> dict:
    """Step two of login: check the TOTP code against the stored secret."""
    challenge = _consume_challenge(challenge_token, '2fa')
    affiliate = challenge.affiliate

    if not verify_totp(affiliate.two_factor_secret, code):
        challenge.attempts = F('attempts') + 1
        challenge.save(update_fields=['attempts'])
        raise ValueError('That code is not valid. Please try again.')

    challenge.consumed_at = timezone.now()
    challenge.save(update_fields=['consumed_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'auth.login.2fa',
          actor_id=affiliate.id, actor_label=affiliate.name, ip=ip)
    return _login_payload(affiliate)


def request_password_reset(email: str) -> dict:
    """Start a reset. Always reports success.

    Returning "no such account" here would turn this endpoint into a directory
    of who is an affiliate.
    """
    affiliate = Affiliate.objects.filter(email=_normalize_email(email)).first()
    if affiliate:
        token = _issue_challenge(affiliate, 'reset', minutes=30)
        # Delivery goes through whatever channel the product uses for player
        # mail; until that is wired the token is logged for operator recovery.
        logger.info('affiliate password reset requested affiliate=%s token=%s',
                    affiliate.id, token)
        audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE,
              'auth.password_reset.requested', actor_id=affiliate.id)
    return {'sent': True}


def reset_password(challenge_token: str, new_password: str) -> dict:
    if not new_password or len(new_password) < 8:
        raise ValueError('Password must be at least 8 characters')
    challenge = _consume_challenge(challenge_token, 'reset')
    affiliate = challenge.affiliate
    with tenant_atomic():
        affiliate.password_hash = hash_password(new_password)
        affiliate.save(update_fields=['password_hash', 'updated_at'])
        challenge.consumed_at = timezone.now()
        challenge.save(update_fields=['consumed_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE,
          'auth.password_reset.completed', actor_id=affiliate.id)
    return {'reset': True}


# ---------------------------------------------------------------------------
# Tracking and attribution
#
# The path a referral actually takes:
#   /r/<link_code>  -> click row written, 302 to the web app with ?ref=&sub=&clk=
#   web app         -> stashes those params in localStorage
#   registration    -> sends them back, and attribute_signup ties the two ends
# ---------------------------------------------------------------------------

def record_click(link_code: str, *, ip=None, user_agent=None, referrer=None,
                 country_code=None) -> dict:
    """Log a click and work out where to send the visitor.

    Returns a redirect target even when the code is unknown or the link is
    disabled. A mistyped or retired link should land someone on the site, not on
    an error page — losing the attribution is the acceptable failure here,
    losing the visitor is not.
    """
    link = AffiliateLink.objects.filter(code=(link_code or '').strip()).first()
    if not link or not link.is_active:
        return {'redirect_url': web_base_url(), 'click_id': None}

    affiliate = Affiliate.objects.filter(id=link.affiliate_id).first()
    if not affiliate or affiliate.status != Affiliate.Status.APPROVED or not affiliate.is_active:
        return {'redirect_url': web_base_url(), 'click_id': None}

    click_id = None
    try:
        with tenant_atomic():
            click = AffiliateClick.objects.create(
                affiliate_id=affiliate.id,
                link_id=link.id,
                sub_id=link.sub_id,
                ip_address=(ip or '')[:45] or None,
                user_agent=user_agent,
                referrer_url=(referrer or '')[:500] or None,
                country_code=(country_code or '')[:2] or None,
            )
            click_id = click.id
            AffiliateLink.objects.filter(id=link.id).update(
                clicks_count=F('clicks_count') + 1
            )
    except Exception:
        # Same reasoning: a tracking failure must not break the funnel.
        logger.exception('failed to record affiliate click for link %s', link_code)

    target = link.target_path or '/'
    if not target.startswith('/'):
        target = '/' + target
    query = f'ref={affiliate.code}'
    if link.sub_id:
        query += f'&sub={link.sub_id}'
    if click_id:
        query += f'&clk={click_id}'
    separator = '&' if '?' in target else '?'
    return {
        'redirect_url': f'{web_base_url()}{target}{separator}{query}',
        'click_id': click_id,
    }


def resolve_ref(ref: str, sub: str | None = None, *, ip=None, user_agent=None,
                referrer=None) -> dict:
    """Validate a bare ``?ref=`` that did not come through /r/.

    Someone can share their code by hand rather than the tracking URL. That
    should still count, so this records a link-less click and confirms the code.
    """
    affiliate = Affiliate.objects.filter(
        code__iexact=(ref or '').strip(), status=Affiliate.Status.APPROVED,
        is_active=True,
    ).first()
    if not affiliate:
        return {'valid': False, 'affiliate_name': None, 'code': None, 'click_id': None}

    click_id = None
    try:
        click = AffiliateClick.objects.create(
            affiliate_id=affiliate.id, link_id=None, sub_id=(sub or None),
            ip_address=(ip or '')[:45] or None, user_agent=user_agent,
            referrer_url=(referrer or '')[:500] or None,
        )
        click_id = click.id
    except Exception:
        logger.exception('failed to record bare-ref click for %s', ref)

    return {
        'valid': True,
        'affiliate_name': affiliate.name,
        'code': affiliate.code,
        'click_id': click_id,
    }


def _flag_fraud(affiliate_id, referral_id, reason, rule_key, risk_level, metadata=None):
    """Record a suspicious signal.

    Flags never block a sign-up. What they do is stop the resulting commission
    auto-approving, so a person looks at the money before it moves. Blocking
    registrations on a heuristic would cost real players for a guess.
    """
    try:
        AffiliateFraudFlag.objects.create(
            affiliate_id=affiliate_id, referral_id=referral_id, reason=reason,
            rule_key=rule_key, risk_level=risk_level, metadata=metadata,
        )
    except Exception:
        logger.exception('failed to write fraud flag %s', rule_key)


def _run_fraud_checks(affiliate: Affiliate, referral_id, *, ip, email, phone,
                      settings: dict) -> None:
    # Self-referral: the affiliate signing up under their own code.
    if settings.get('fraud_flag_self_referral'):
        aff_email = _normalize_email(affiliate.email)
        if (email and _normalize_email(email) == aff_email) or (
            phone and affiliate.phone and phone.strip() == affiliate.phone.strip()
        ):
            _flag_fraud(affiliate.id, referral_id,
                        'Referred player matches the affiliate\'s own contact details',
                        'self_referral', AffiliateFraudFlag.RiskLevel.CRITICAL,
                        {'email': email, 'phone': phone})

    # Disposable email domains — cheap to farm, so worth a look.
    if settings.get('fraud_block_disposable_emails') and email and '@' in email:
        domain = _normalize_email(email).split('@')[-1]
        if domain in DISPOSABLE_EMAIL_DOMAINS:
            _flag_fraud(affiliate.id, referral_id,
                        f'Referred player used a disposable email domain ({domain})',
                        'disposable_email', AffiliateFraudFlag.RiskLevel.MEDIUM,
                        {'domain': domain})

    # Velocity: many conversions from one IP in a short window.
    limit = int(settings.get('fraud_max_referrals_per_ip') or 0)
    if limit and ip:
        recent = AffiliateClick.objects.filter(
            affiliate_id=affiliate.id, ip_address=ip, converted=True,
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).count()
        if recent > limit:
            _flag_fraud(affiliate.id, referral_id,
                        f'{recent} conversions from IP {ip} in the last hour',
                        'ip_velocity', AffiliateFraudFlag.RiskLevel.HIGH,
                        {'ip': ip, 'count': recent})


def attribute_signup(user_id: int, ref: str | None, sub: str | None = None,
                     click_id=None, *, ip=None, email=None, phone=None) -> bool:
    """Link a newly registered player to the affiliate who referred them.

    Called from ``services.register_user`` *after* its transaction commits and
    inside a try/except, so nothing in here can roll back a created account.
    Returns True when an attribution was written.

    Safe to call twice: ``affiliate_referrals.user_id`` is unique, so a repeat
    lands on the IntegrityError branch and changes nothing.
    """
    if not ref:
        return False

    affiliate = Affiliate.objects.filter(
        code__iexact=ref.strip(), status=Affiliate.Status.APPROVED, is_active=True
    ).first()
    if not affiliate:
        logger.info('attribution: no approved affiliate for ref=%s', ref)
        return False

    settings = get_program_settings()
    window_days = int(settings.get('cookie_window_days') or 30)

    click = None
    link_id = None
    if click_id:
        click = AffiliateClick.objects.filter(id=click_id).first()
        if click:
            # A click that belongs to a different affiliate, or one older than
            # the attribution window, is not evidence for this referral.
            if click.affiliate_id != affiliate.id:
                click = None
            elif click.created_at < timezone.now() - timedelta(days=window_days):
                logger.info('attribution: click %s older than %s-day window',
                            click_id, window_days)
                click = None
        if click:
            link_id = click.link_id

    try:
        with tenant_atomic():
            referral = AffiliateReferral.objects.create(
                affiliate_id=affiliate.id,
                user_id=user_id,
                link_id=link_id,
                click_id=click.id if click else None,
                sub_id=(sub or (click.sub_id if click else None)),
                attributed_at=timezone.now(),
            )
            # The first and only writer of this column since the schema shipped.
            UserSetting.objects.filter(user_id=user_id).update(
                affiliate_id=affiliate.id
            )
            if click:
                AffiliateClick.objects.filter(id=click.id).update(
                    converted=True, converted_user_id=user_id
                )
            Affiliate.objects.filter(id=affiliate.id).update(
                total_referrals=F('total_referrals') + 1
            )
    except IntegrityError:
        # Already attributed — first attribution wins, and that is deliberate:
        # re-running a signup must never move a player between affiliates.
        logger.info('attribution: user %s already attributed', user_id)
        return False

    _run_fraud_checks(affiliate, referral.id, ip=ip, email=email, phone=phone,
                      settings=settings)
    notify(affiliate.id, 'referral', 'New referral',
           f'A new player signed up through {affiliate.code}.',
           {'referral_id': referral.id})
    audit(affiliate.id, AffiliateAuditLog.ActorType.SYSTEM, 'referral.attributed',
          target=f'user:{user_id}', ip=ip,
          after={'referral_id': referral.id, 'link_id': link_id})
    return True


def record_deposit(user_id: int, amount, transaction_id=None) -> bool:
    """Update a referral's deposit totals when a deposit is confirmed.

    Called from ``services.confirm_deposit`` inside its existing side-effect
    try/except, so this can never roll back a credited deposit.

    Deliberately does **not** award CPA. The nightly run does that, so every
    rupee of commission passes through the same pending -> approved -> paid
    lifecycle. Paying a bounty inline would create money the approval workflow
    never sees.
    """
    referral = AffiliateReferral.objects.filter(user_id=user_id).first()
    if not referral:
        return False

    amount = money(amount)
    now = timezone.now()
    with tenant_atomic():
        updates = {
            'lifetime_deposits': F('lifetime_deposits') + amount,
            'deposit_count': F('deposit_count') + 1,
            'last_active_at': now,
        }
        # The null check is the idempotency: a second deposit never overwrites
        # the first, so FTD-based commission cannot be earned twice.
        if referral.first_deposit_at is None:
            updates.update(
                first_deposit_at=now,
                first_deposit_amount=amount,
                first_deposit_tx_id=transaction_id,
            )
        AffiliateReferral.objects.filter(id=referral.id).update(**updates)

    if referral.first_deposit_at is None:
        notify(referral.affiliate_id, 'ftd', 'First deposit',
               f'A referred player made their first deposit of {inr(amount)}.',
               {'referral_id': referral.id})
    return True


# ---------------------------------------------------------------------------
# Dashboard and reporting
# ---------------------------------------------------------------------------

def _parse_date(value, fallback=None):
    if not value:
        return fallback
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return fallback


def _range_bounds(date_from=None, date_to=None, default_days: int = 30):
    """Resolve a requested range into concrete dates, defaulting to the last N
    days. The portal's date picker now reaches every query through this."""
    today = timezone.now().date()
    end = _parse_date(date_to, today)
    start = _parse_date(date_from, end - timedelta(days=default_days - 1))
    if start > end:
        start, end = end, start
    return start, end


def _dt_range(start: date, end: date):
    """Half-open datetime bounds for a date range, so the last day is included
    in full rather than truncated at midnight."""
    tz = timezone.get_current_timezone()
    begin = timezone.make_aware(
        timezone.datetime.combine(start, timezone.datetime.min.time()), tz
    )
    finish = timezone.make_aware(
        timezone.datetime.combine(end + timedelta(days=1), timezone.datetime.min.time()),
        tz,
    )
    return begin, finish


def _descendant_ids(affiliate_id: int, max_depth: int = 5) -> list[int]:
    """Every affiliate under this one.

    Iterative with a visited set and a depth cap: ``parent_affiliate_id`` has no
    FK and nothing stops a bad edit creating a cycle, so a naive recursive walk
    could hang the request.
    """
    seen = {affiliate_id}
    frontier = [affiliate_id]
    out = []
    for _ in range(max_depth):
        if not frontier:
            break
        children = list(
            Affiliate.objects.filter(parent_id__in=frontier)
            .exclude(id__in=seen)
            .values_list('id', flat=True)
        )
        if not children:
            break
        seen.update(children)
        out.extend(children)
        frontier = children
    return out


def _stats_for(affiliate_id: int, begin, finish) -> dict:
    clicks = AffiliateClick.objects.filter(
        affiliate_id=affiliate_id, created_at__gte=begin, created_at__lt=finish
    ).count()
    referrals = AffiliateReferral.objects.filter(affiliate_id=affiliate_id)
    signups = referrals.filter(
        attributed_at__gte=begin, attributed_at__lt=finish
    ).count()
    ftds = referrals.filter(
        first_deposit_at__gte=begin, first_deposit_at__lt=finish
    ).count()
    active_players = referrals.filter(
        status=AffiliateReferral.Status.ACTIVE,
        last_active_at__gte=timezone.now() - timedelta(days=30),
    ).count()
    commission = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate_id, created_at__gte=begin, created_at__lt=finish
    ).exclude(status=AffiliateCommissionLedger.Status.CLAWED_BACK).aggregate(
        total=Sum('amount')
    )['total'] or ZERO
    pending_payout = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate_id,
        status=AffiliateCommissionLedger.Status.APPROVED,
        payout_id__isnull=True,
    ).aggregate(total=Sum('amount'))['total'] or ZERO
    return {
        'clicks': clicks,
        'signups': signups,
        'ftds': ftds,
        'active_players': active_players,
        'commission': f(commission),
        'pending_payout': f(pending_payout),
    }


def _trend(current, previous) -> dict:
    """Percentage change against the preceding window of equal length.

    The dashboard used to render six hardcoded trend percentages that never
    moved; these are the real ones.
    """
    current = float(current or 0)
    previous = float(previous or 0)
    if previous == 0:
        pct = 100.0 if current > 0 else 0.0
    else:
        pct = ((current - previous) / previous) * 100
    return {'value': current, 'delta_pct': round(pct, 1)}


def get_dashboard(affiliate: Affiliate, date_from=None, date_to=None) -> dict:
    start, end = _range_bounds(date_from, date_to)
    begin, finish = _dt_range(start, end)
    span = (end - start).days + 1
    prev_begin, prev_finish = _dt_range(start - timedelta(days=span),
                                        start - timedelta(days=1))

    stats = _stats_for(affiliate.id, begin, finish)
    previous = _stats_for(affiliate.id, prev_begin, prev_finish)
    trends = {key: _trend(stats[key], previous[key]) for key in stats}

    clicks, signups, ftds = stats['clicks'], stats['signups'], stats['ftds']
    top = max(clicks, 1)
    funnel = [
        {'label': 'Clicks', 'value': clicks, 'pct': 100.0},
        {'label': 'Signups', 'value': signups, 'pct': round(signups / top * 100, 1)},
        {'label': 'First deposits', 'value': ftds, 'pct': round(ftds / top * 100, 1)},
    ]
    return {
        'stats': stats,
        'trends': trends,
        'funnel': funnel,
        'range': {'from': start.isoformat(), 'to': end.isoformat()},
        'commission_rate': f(commission_rate_for(affiliate)),
        'commission_type': affiliate.commission_type,
    }


def get_dashboard_chart(affiliate: Affiliate, date_from=None, date_to=None,
                        metric: str = 'commission') -> dict:
    """Daily series for the dashboard chart.

    Returns ``max`` alongside the points because the chart is hand-drawn from
    divs and previously scaled against a hardcoded ceiling — anything above it
    simply overflowed the container.
    """
    start, end = _range_bounds(date_from, date_to, default_days=7)
    buckets = {}
    day = start
    while day <= end:
        buckets[day.isoformat()] = 0.0
        day += timedelta(days=1)

    if metric == 'clicks':
        begin, finish = _dt_range(start, end)
        rows = AffiliateClick.objects.filter(
            affiliate_id=affiliate.id, created_at__gte=begin, created_at__lt=finish
        ).values_list('created_at', flat=True)
        for created in rows:
            key = timezone.localtime(created).date().isoformat()
            if key in buckets:
                buckets[key] += 1
    else:
        rows = AffiliateCommissionLedger.objects.filter(
            affiliate_id=affiliate.id, period_start__gte=start, period_start__lte=end
        ).exclude(status=AffiliateCommissionLedger.Status.CLAWED_BACK).values(
            'period_start'
        ).annotate(total=Sum('amount'))
        for row in rows:
            key = row['period_start'].isoformat()
            if key in buckets:
                buckets[key] += float(row['total'] or 0)

    points = [
        {'label': date.fromisoformat(k).strftime('%a %d'), 'date': k, 'value': round(v, 2)}
        for k, v in buckets.items()
    ]
    peak = max((p['value'] for p in points), default=0)
    return {
        'points': points,
        # A non-zero ceiling with headroom, so an all-zero series still renders
        # a sane axis instead of dividing by zero.
        'max': round(peak * 1.15, 2) if peak else 100,
        'metric': metric,
    }


def get_activity(affiliate: Affiliate, limit: int = 12) -> dict:
    """Recent events, merged from referrals, deposits and payouts.

    Built from real rows rather than a feed table: there is no event log in this
    product, and three small ordered queries beat introducing one.
    """
    events = []
    referrals = AffiliateReferral.objects.filter(
        affiliate_id=affiliate.id
    ).order_by('-attributed_at')[:limit]
    for referral in referrals:
        if referral.attributed_at:
            events.append({
                'type': 'signup',
                'text': f'New player signed up (P-{referral.user_id:05d})',
                'at': _iso(referral.attributed_at),
            })
        if referral.first_deposit_at:
            events.append({
                'type': 'deposit',
                'text': f'P-{referral.user_id:05d} deposited '
                        f'{inr(referral.first_deposit_amount)}',
                'at': _iso(referral.first_deposit_at),
            })
    for payout in AffiliatePayout.objects.filter(
        affiliate_id=affiliate.id
    ).order_by('-created_at')[:limit]:
        events.append({
            'type': 'payout',
            'text': f'Payout {inr(payout.amount)} — {payout.status}',
            'at': _iso(payout.processed_at or payout.requested_at or payout.created_at),
        })

    events = [e for e in events if e['at']]
    events.sort(key=lambda e: e['at'], reverse=True)
    return {'records': events[:limit], 'total': len(events)}


# ---------------------------------------------------------------------------
# Links and creatives
# ---------------------------------------------------------------------------

def _link_stats(affiliate_id: int, link_ids: list[int]) -> dict:
    """Signups / FTDs / commission per link, in three queries rather than per row."""
    if not link_ids:
        return {}
    stats = {lid: {'signups': 0, 'ftds': 0, 'commission': ZERO} for lid in link_ids}

    rows = AffiliateReferral.objects.filter(
        affiliate_id=affiliate_id, link_id__in=link_ids
    ).values('link_id').annotate(
        signups=Count('id'),
        ftds=Count('id', filter=Q(first_deposit_at__isnull=False)),
        commission=Sum('lifetime_commission'),
    )
    for row in rows:
        entry = stats.get(row['link_id'])
        if entry:
            entry['signups'] = row['signups']
            entry['ftds'] = row['ftds']
            entry['commission'] = row['commission'] or ZERO
    return stats


def list_links(affiliate: Affiliate, *, q=None, limit=50, offset=0) -> dict:
    qs = AffiliateLink.objects.filter(affiliate_id=affiliate.id)
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(sub_id__icontains=q) | Q(code__icontains=q))
    total = qs.count()
    links = list(qs.order_by('-created_at')[offset:offset + limit])
    stats = _link_stats(affiliate.id, [link.id for link in links])
    records = [serialize_link(link, stats.get(link.id)) for link in links]
    return {
        'records': records,
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'total_clicks': sum(r['clicks'] for r in records),
            'total_signups': sum(r['signups'] for r in records),
            'total_ftds': sum(r['ftds'] for r in records),
            'total_commission': round(sum(r['commission'] for r in records), 2),
        },
    }


def create_link(affiliate: Affiliate, *, name, sub_id=None, target_path='/') -> dict:
    name = (name or '').strip()
    if not name:
        raise ValueError('Campaign name is required')
    target_path = (target_path or '/').strip() or '/'
    if not target_path.startswith('/'):
        target_path = '/' + target_path

    link = AffiliateLink.objects.create(
        affiliate_id=affiliate.id,
        code=_generate_link_code(),
        name=name,
        sub_id=(sub_id or '').strip() or None,
        target_path=target_path,
    )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'link.created',
          actor_id=affiliate.id, target=f'link:{link.id}',
          after={'name': name, 'code': link.code})
    return serialize_link(link)


def update_link(affiliate: Affiliate, link_id: int, payload: dict) -> dict:
    link = AffiliateLink.objects.filter(
        id=link_id, affiliate_id=affiliate.id
    ).first()
    if not link:
        raise ValueError('Link not found')

    fields = []
    if 'name' in payload and (payload['name'] or '').strip():
        link.name = payload['name'].strip()
        fields.append('name')
    if 'subId' in payload:
        link.sub_id = (payload['subId'] or '').strip() or None
        fields.append('sub_id')
    if 'isActive' in payload:
        link.is_active = bool(payload['isActive'])
        fields.append('is_active')
    if fields:
        fields.append('updated_at')
        link.save(update_fields=fields)
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'link.updated',
          actor_id=affiliate.id, target=f'link:{link.id}', after=payload)
    return serialize_link(link)


def delete_link(affiliate: Affiliate, link_id: int) -> dict:
    """Retire a link.

    Deactivates rather than deletes: clicks and referrals point back at it, and
    a partner should not be able to erase the provenance of commission they
    have already been paid.
    """
    link = AffiliateLink.objects.filter(id=link_id, affiliate_id=affiliate.id).first()
    if not link:
        raise ValueError('Link not found')
    link.is_active = False
    link.save(update_fields=['is_active', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'link.archived',
          actor_id=affiliate.id, target=f'link:{link.id}')
    return {'archived': True, 'id': link.id}


def list_creatives(limit: int = 100, offset: int = 0) -> dict:
    qs = AffiliateCreative.objects.filter(is_active=True).order_by('sort_order', 'id')
    total = qs.count()
    return {
        'records': [serialize_creative(c) for c in qs[offset:offset + limit]],
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def list_landing_pages() -> dict:
    """Server-owned so the portal's target dropdown cannot drift from reality."""
    return {'records': LANDING_PAGES, 'total': len(LANDING_PAGES)}


# ---------------------------------------------------------------------------
# Referrals
# ---------------------------------------------------------------------------

def list_referrals(affiliate: Affiliate, *, status=None, q=None, date_from=None,
                   date_to=None, limit=50, offset=0) -> dict:
    qs = AffiliateReferral.objects.filter(affiliate_id=affiliate.id)
    if status and status != 'all':
        qs = qs.filter(status=status)
    if date_from or date_to:
        start, end = _range_bounds(date_from, date_to, default_days=3650)
        begin, finish = _dt_range(start, end)
        qs = qs.filter(attributed_at__gte=begin, attributed_at__lt=finish)
    if q:
        # Players are identified by reference, not by name — an affiliate has no
        # business searching the player base by personal details.
        digits = ''.join(ch for ch in str(q) if ch.isdigit())
        qs = qs.filter(user_id=int(digits)) if digits else qs.none()

    total = qs.count()
    all_qs = AffiliateReferral.objects.filter(affiliate_id=affiliate.id)
    counts = {
        'all': all_qs.count(),
        'active': all_qs.filter(status=AffiliateReferral.Status.ACTIVE).count(),
        'dormant': all_qs.filter(status=AffiliateReferral.Status.DORMANT).count(),
        'blocked': all_qs.filter(status=AffiliateReferral.Status.BLOCKED).count(),
    }
    ftd_count = all_qs.filter(first_deposit_at__isnull=False).count()
    totals = all_qs.aggregate(
        commission=Sum('lifetime_commission'), deposits=Sum('lifetime_deposits')
    )

    rows = list(qs.order_by('-attributed_at')[offset:offset + limit])
    prefs = {
        p.user_id: p
        for p in UserSetting.objects.filter(user_id__in=[r.user_id for r in rows])
    }
    countries = dict(
        User.objects.filter(id__in=[r.user_id for r in rows])
        .values_list('id', 'country_code')
    )
    link_names = dict(
        AffiliateLink.objects.filter(affiliate_id=affiliate.id)
        .values_list('id', 'name')
    )
    for row in rows:
        row._prefs = prefs.get(row.user_id)
        row._country_code = countries.get(row.user_id)

    return {
        'records': [serialize_referral(r, link_names=link_names) for r in rows],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'counts': counts,
            'total_players': counts['all'],
            'ftd_count': ftd_count,
            'ftd_rate': round(ftd_count / counts['all'] * 100, 1) if counts['all'] else 0,
            'total_commission': f(totals['commission'] or 0),
            'total_deposits': f(totals['deposits'] or 0),
        },
    }


def get_referral_detail(affiliate: Affiliate, referral_id: int) -> dict:
    referral = AffiliateReferral.objects.filter(
        id=referral_id, affiliate_id=affiliate.id
    ).first()
    if not referral:
        raise ValueError('Referral not found')

    referral._prefs = UserSetting.objects.filter(user_id=referral.user_id).first()
    referral._country_code = User.objects.filter(
        id=referral.user_id
    ).values_list('country_code', flat=True).first()
    link_names = dict(
        AffiliateLink.objects.filter(affiliate_id=affiliate.id).values_list('id', 'name')
    )

    # Six months of deposits. Labels come from the server because the client
    # previously hardcoded month names, which were wrong for most of the year.
    today = timezone.now().date().replace(day=1)
    months = []
    for offset in range(5, -1, -1):
        year = today.year
        month = today.month - offset
        while month <= 0:
            month += 12
            year -= 1
        months.append(date(year, month, 1))

    labels, values = [], []
    for month_start in months:
        if month_start.month == 12:
            month_end = date(month_start.year + 1, 1, 1)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1)
        begin, finish = _dt_range(month_start, month_end - timedelta(days=1))
        total = AffiliateCommissionLedger.objects.filter(
            affiliate_id=affiliate.id, referral_id=referral.id,
            period_start__gte=begin.date(), period_start__lt=finish.date(),
        ).aggregate(total=Sum('base_amount'))['total'] or 0
        labels.append(month_start.strftime('%b'))
        values.append(f(total))

    entries = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate.id, referral_id=referral.id
    ).order_by('-period_start')[:20]

    activity = []
    if referral.attributed_at:
        activity.append({'type': 'signup', 'text': 'Signed up through your link',
                         'at': _iso(referral.attributed_at)})
    if referral.first_deposit_at:
        activity.append({
            'type': 'deposit',
            'text': f'First deposit of {inr(referral.first_deposit_amount)}',
            'at': _iso(referral.first_deposit_at),
        })
    for entry in entries[:5]:
        activity.append({
            'type': 'commission',
            'text': f'{entry.get_entry_type_display()} of {inr(entry.amount)}',
            'at': _iso(entry.created_at),
        })
    activity.sort(key=lambda e: e['at'] or '', reverse=True)

    return {
        'referral': serialize_referral(referral, link_names=link_names),
        'monthly_deposits': {'labels': labels, 'values': values},
        'activity': activity,
        'ledger': [serialize_ledger_entry(e) for e in entries],
    }


# ---------------------------------------------------------------------------
# Sub-affiliate network
# ---------------------------------------------------------------------------

def get_network(affiliate: Affiliate, *, q=None) -> dict:
    """The affiliate's recruited partners, one level deep with their children.

    Override earnings are read from the ledger rather than recomputed, so this
    screen and the money always agree.
    """
    settings = get_program_settings()
    children = list(Affiliate.objects.filter(parent_id=affiliate.id).order_by('-created_at'))
    if q:
        needle = q.lower()
        children = [c for c in children
                    if needle in (c.name or '').lower() or needle in (c.code or '').lower()]

    child_ids = [c.id for c in children]
    grandchildren = {}
    for row in Affiliate.objects.filter(parent_id__in=child_ids).order_by('name'):
        grandchildren.setdefault(row.parent_id, []).append(row)

    # Override earned per sub, from the ledger.
    override_rows = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate.id,
        entry_type=AffiliateCommissionLedger.EntryType.OVERRIDE,
        source_affiliate_id__in=child_ids,
    ).exclude(status=AffiliateCommissionLedger.Status.CLAWED_BACK).values(
        'source_affiliate_id'
    ).annotate(total=Sum('amount'))
    override_earned = {r['source_affiliate_id']: r['total'] or ZERO for r in override_rows}

    click_counts = dict(
        AffiliateClick.objects.filter(affiliate_id__in=child_ids)
        .values('affiliate_id').annotate(n=Count('id'))
        .values_list('affiliate_id', 'n')
    )
    referral_rows = AffiliateReferral.objects.filter(
        affiliate_id__in=child_ids
    ).values('affiliate_id').annotate(
        signups=Count('id'),
        ftds=Count('id', filter=Q(first_deposit_at__isnull=False)),
        commission=Sum('lifetime_commission'),
    )
    referral_stats = {r['affiliate_id']: r for r in referral_rows}

    records = []
    for child in children:
        stats = referral_stats.get(child.id, {})
        records.append({
            'id': child.id,
            'code': child.code,
            'name': child.name,
            'status': child.status,
            'commission_tier': child.commission_tier,
            'tier_label': child.tier_label,
            'joined_at': _iso(child.created_at),
            'clicks': click_counts.get(child.id, 0),
            'signups': stats.get('signups', 0),
            'ftds': stats.get('ftds', 0),
            'sub_commission': f(stats.get('commission') or 0),
            'override_rate': f(override_rate_for(child, settings)),
            'override_earned': f(override_earned.get(child.id, 0)),
            'children': [
                {
                    'id': g.id, 'code': g.code, 'name': g.name,
                    'joined_at': _iso(g.created_at),
                    'commission_tier': g.commission_tier,
                    'recruits': g.total_referrals,
                }
                for g in grandchildren.get(child.id, [])
            ],
        })

    total_override = sum(r['override_earned'] for r in records)
    rates = [r['override_rate'] for r in records]
    return {
        'records': records,
        'total': len(records),
        'summary': {
            'sub_count': len(records),
            'total_sub_commission': round(sum(r['sub_commission'] for r in records), 2),
            'total_override_earned': round(total_override, 2),
            # Computed, not the fixed string the panel used to display.
            'average_override_rate': round(sum(rates) / len(rates), 2) if rates else 0,
            'network_signups': sum(r['signups'] for r in records),
        },
    }


def create_invite(affiliate: Affiliate, override_rate=None) -> dict:
    """Build a sub-affiliate invite URL.

    The rate is capped at the program default so an affiliate cannot mint
    themselves a bigger cut than staff have sanctioned; approval confirms it.
    """
    settings = get_program_settings()
    default_rate = money(settings['default_override_rate'])
    rate = money(override_rate) if override_rate else default_rate
    if rate <= ZERO or rate > default_rate:
        rate = default_rate

    url = (f'{affiliate_portal_url()}/apply'
           f'?parent_affiliate_code={affiliate.code}&override_rate={rate}')
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'network.invite_created',
          actor_id=affiliate.id, after={'override_rate': f(rate)})
    return {'invite_url': url, 'override_rate': f(rate), 'code': affiliate.code}


# ---------------------------------------------------------------------------
# Earnings ledger
# ---------------------------------------------------------------------------

def list_earnings(affiliate: Affiliate, *, entry_type=None, status=None,
                  date_from=None, date_to=None, q=None, limit=50, offset=0) -> dict:
    qs = AffiliateCommissionLedger.objects.filter(affiliate_id=affiliate.id)
    if entry_type and entry_type not in ('All', 'all'):
        qs = qs.filter(entry_type=entry_type)
    if status and status != 'all':
        qs = qs.filter(status=status)
    if date_from or date_to:
        start, end = _range_bounds(date_from, date_to, default_days=3650)
        qs = qs.filter(period_start__gte=start, period_start__lte=end)
    if q:
        digits = ''.join(ch for ch in str(q) if ch.isdigit())
        if digits:
            qs = qs.filter(Q(id=int(digits)) | Q(referral_id=int(digits)))

    total = qs.count()
    rows = list(qs.order_by('-period_start', '-id')[offset:offset + limit])

    source_ids = {r.source_affiliate_id for r in rows if r.source_affiliate_id}
    source_names = dict(
        Affiliate.objects.filter(id__in=source_ids).values_list('id', 'name')
    ) if source_ids else {}

    # Summary spans the whole ledger, not the current page — the cards above the
    # table are about the account, not about what happens to be visible.
    by_status = {
        row['status']: row['total'] or ZERO
        for row in AffiliateCommissionLedger.objects.filter(
            affiliate_id=affiliate.id
        ).values('status').annotate(total=Sum('amount'))
    }
    return {
        'records': [serialize_ledger_entry(r, source_names) for r in rows],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'pending': f(by_status.get('pending', 0)),
            'approved': f(by_status.get('approved', 0)),
            'paid': f(by_status.get('paid', 0)),
            'clawed_back': f(by_status.get('clawed_back', 0)),
            'commission_type': affiliate.commission_type,
            'commission_rate': f(commission_rate_for(affiliate)),
        },
    }


def earnings_csv_rows(affiliate: Affiliate, *, date_from=None, date_to=None,
                      entry_type=None, status=None):
    """Rows for the statement export. Yields header first, then data."""
    data = list_earnings(affiliate, entry_type=entry_type, status=status,
                         date_from=date_from, date_to=date_to, limit=100000, offset=0)
    yield ['Entry ID', 'Period start', 'Period end', 'Type', 'Base', 'Base amount',
           'Rate %', 'Amount', 'Currency', 'Status', 'Source affiliate']
    for row in data['records']:
        yield [
            row['id'], row['period_start'], row['period_end'], row['entry_type'],
            row['base_kind'], row['base_amount'], row['rate'], row['amount'],
            row['currency'], row['status'], row['source_affiliate_name'] or '',
        ]


# ---------------------------------------------------------------------------
# Payouts
# ---------------------------------------------------------------------------

def _available_balance(affiliate_id: int) -> Decimal:
    """Approved commission not yet claimed by a payout.

    Pending money is deliberately excluded: it has not cleared the approval
    workflow, and letting it be withdrawn would defeat the point of having one.
    """
    total = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate_id,
        status=AffiliateCommissionLedger.Status.APPROVED,
        payout_id__isnull=True,
    ).aggregate(total=Sum('amount'))['total']
    return money(total or 0)


def _next_payout_date(cycle: str) -> str:
    today = timezone.now().date()
    if cycle == 'weekly':
        return (today + timedelta(days=(7 - today.weekday()) % 7 or 7)).isoformat()
    if cycle == 'monthly':
        first = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
        return first.isoformat()
    return today.isoformat()


def get_payouts(affiliate: Affiliate, *, status=None, limit=50, offset=0) -> dict:
    settings = get_program_settings()
    available = _available_balance(affiliate.id)
    threshold = payout_threshold_for(affiliate, settings)
    pending_total = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate.id, status=AffiliateCommissionLedger.Status.PENDING
    ).aggregate(total=Sum('amount'))['total'] or ZERO

    qs = AffiliatePayout.objects.filter(affiliate_id=affiliate.id)
    if status and status != 'all':
        qs = qs.filter(status=status)
    total = qs.count()
    payouts = list(qs.order_by('-created_at')[offset:offset + limit])
    entry_counts = dict(
        AffiliateCommissionLedger.objects.filter(
            payout_id__in=[p.id for p in payouts]
        ).values('payout_id').annotate(n=Count('id')).values_list('payout_id', 'n')
    ) if payouts else {}

    methods = AffiliatePayoutMethod.objects.filter(
        affiliate_id=affiliate.id
    ).order_by('-is_primary', 'id')
    has_open_request = AffiliatePayout.objects.filter(
        affiliate_id=affiliate.id,
        status__in=[AffiliatePayout.Status.REQUESTED, AffiliatePayout.Status.APPROVED],
    ).exists()

    return {
        'balance': {
            'available': f(available),
            'pending': f(pending_total),
            'minimum_threshold': f(threshold),
            'next_cycle_at': _next_payout_date(settings['payout_cycle']),
            'payout_cycle': settings['payout_cycle'],
            'can_request': bool(
                available >= threshold and available > ZERO
                and methods.exists() and not has_open_request
            ),
            'has_open_request': has_open_request,
            'currency': affiliate.currency or settings['currency'],
        },
        'methods': [serialize_payout_method(m) for m in methods],
        'records': [serialize_payout(p, entry_counts.get(p.id, 0)) for p in payouts],
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def request_payout(affiliate: Affiliate, *, amount=None, method_id=None) -> dict:
    """Claim approved commission.

    Claiming stamps ``payout_id`` onto the ledger rows inside the transaction,
    which is what stops the same commission being claimed by two concurrent
    requests: the second finds nothing left unclaimed.
    """
    settings = get_program_settings()
    threshold = payout_threshold_for(affiliate, settings)

    if AffiliatePayout.objects.filter(
        affiliate_id=affiliate.id,
        status__in=[AffiliatePayout.Status.REQUESTED, AffiliatePayout.Status.APPROVED],
    ).exists():
        raise ValueError('You already have a payout in progress.')

    method = None
    if method_id:
        method = AffiliatePayoutMethod.objects.filter(
            id=method_id, affiliate_id=affiliate.id
        ).first()
    if not method:
        method = AffiliatePayoutMethod.objects.filter(
            affiliate_id=affiliate.id
        ).order_by('-is_primary', 'id').first()
    if not method:
        raise ValueError('Add a payout method before requesting a payout.')

    with tenant_atomic():
        entries = list(
            AffiliateCommissionLedger.objects.select_for_update().filter(
                affiliate_id=affiliate.id,
                status=AffiliateCommissionLedger.Status.APPROVED,
                payout_id__isnull=True,
            ).order_by('period_start', 'id')
        )
        available = money(sum((e.amount for e in entries), ZERO))
        if available <= ZERO:
            raise ValueError('You have no approved commission available to withdraw.')
        if available < threshold:
            raise ValueError(
                f'Minimum payout is {inr(threshold)}. Your available balance is '
                f'{inr(available)}.'
            )

        # A partial amount claims whole entries up to that value: splitting a
        # ledger row would make the audit trail lie about what was paid.
        requested = money(amount) if amount else available
        if requested > available:
            raise ValueError('Requested amount exceeds your available balance.')

        claimed, running = [], ZERO
        for entry in entries:
            if running >= requested:
                break
            claimed.append(entry.id)
            running += entry.amount
        if running < threshold:
            raise ValueError(f'Minimum payout is {inr(threshold)}.')

        payout = AffiliatePayout.objects.create(
            affiliate_id=affiliate.id,
            amount=running,
            currency=affiliate.currency or settings['currency'],
            method_id=method.id,
            method_label=method.label or method.get_method_type_display(),
            method_details=method.masked_details,
            status=AffiliatePayout.Status.REQUESTED,
            requested_at=timezone.now(),
        )
        AffiliateCommissionLedger.objects.filter(id__in=claimed).update(
            payout_id=payout.id
        )

    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'payout.requested',
          actor_id=affiliate.id, target=f'payout:{payout.id}',
          after={'amount': f(running), 'entries': len(claimed)})
    return serialize_payout(payout, len(claimed))


def _mask_details(method_type: str, details: dict) -> str:
    """A human-readable, non-sensitive summary of a payout method."""
    details = details or {}
    if method_type == 'upi':
        upi = str(details.get('upiId') or details.get('upi_id') or '')
        if '@' in upi:
            name, handle = upi.split('@', 1)
            return f'{name[:2]}{"*" * max(len(name) - 2, 0)}@{handle}'
        return upi
    if method_type == 'crypto':
        address = str(details.get('address') or details.get('cryptoAddress') or '')
        return f'{address[:6]}...{address[-4:]}' if len(address) > 12 else address
    bank = str(details.get('bankName') or details.get('bank_name') or 'Bank')
    account = str(details.get('accountNumber') or details.get('account_number') or '')
    return f'{bank} ****{account[-4:]}' if len(account) >= 4 else bank


def list_payout_methods(affiliate: Affiliate) -> dict:
    methods = AffiliatePayoutMethod.objects.filter(
        affiliate_id=affiliate.id
    ).order_by('-is_primary', 'id')
    return {'records': [serialize_payout_method(m) for m in methods],
            'total': methods.count()}


def create_payout_method(affiliate: Affiliate, *, method_type, details,
                         label=None, is_primary=False) -> dict:
    if method_type not in dict(AffiliatePayoutMethod.MethodType.choices):
        raise ValueError('Choose a valid payout method type.')
    details = details or {}
    if method_type == 'upi' and not (details.get('upiId') or details.get('upi_id')):
        raise ValueError('A UPI ID is required.')
    if method_type == 'crypto' and not (details.get('address') or details.get('cryptoAddress')):
        raise ValueError('A wallet address is required.')
    if method_type == 'bank' and not (details.get('accountNumber') or details.get('account_number')):
        raise ValueError('An account number is required.')

    with tenant_atomic():
        first_method = not AffiliatePayoutMethod.objects.filter(
            affiliate_id=affiliate.id
        ).exists()
        # The first method is primary whether or not the caller said so —
        # otherwise an affiliate could end up with methods but no default.
        primary = bool(is_primary) or first_method
        if primary:
            AffiliatePayoutMethod.objects.filter(
                affiliate_id=affiliate.id
            ).update(is_primary=False)
        method = AffiliatePayoutMethod.objects.create(
            affiliate_id=affiliate.id,
            method_type=method_type,
            label=(label or '').strip() or None,
            details=details,
            masked_details=_mask_details(method_type, details),
            is_primary=primary,
        )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'payout_method.created',
          actor_id=affiliate.id, target=f'method:{method.id}',
          after={'type': method_type})
    return serialize_payout_method(method)


def update_payout_method(affiliate: Affiliate, method_id: int, payload: dict) -> dict:
    method = AffiliatePayoutMethod.objects.filter(
        id=method_id, affiliate_id=affiliate.id
    ).first()
    if not method:
        raise ValueError('Payout method not found')
    if payload.get('isPrimary'):
        with tenant_atomic():
            AffiliatePayoutMethod.objects.filter(
                affiliate_id=affiliate.id
            ).update(is_primary=False)
            method.is_primary = True
            method.save(update_fields=['is_primary', 'updated_at'])
    if 'label' in payload:
        method.label = (payload['label'] or '').strip() or None
        method.save(update_fields=['label', 'updated_at'])
    return serialize_payout_method(method)


def delete_payout_method(affiliate: Affiliate, method_id: int) -> dict:
    method = AffiliatePayoutMethod.objects.filter(
        id=method_id, affiliate_id=affiliate.id
    ).first()
    if not method:
        raise ValueError('Payout method not found')
    if AffiliatePayout.objects.filter(
        method_id=method.id,
        status__in=[AffiliatePayout.Status.REQUESTED, AffiliatePayout.Status.APPROVED],
    ).exists():
        raise ValueError('This method is attached to a payout in progress.')

    was_primary = method.is_primary
    with tenant_atomic():
        method.delete()
        if was_primary:
            # Never leave the account without a default.
            replacement = AffiliatePayoutMethod.objects.filter(
                affiliate_id=affiliate.id
            ).order_by('id').first()
            if replacement:
                replacement.is_primary = True
                replacement.save(update_fields=['is_primary', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'payout_method.deleted',
          actor_id=affiliate.id, target=f'method:{method_id}')
    return {'deleted': True, 'id': method_id}


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def get_reports(affiliate: Affiliate, *, breakdown='link', date_from=None,
                date_to=None) -> dict:
    """Performance grouped by link, sub-affiliate or country.

    Every row's ``signups`` is a real aggregate. The previous client-side
    version summed a field the rows did not have, so that column always read 0.
    """
    start, end = _range_bounds(date_from, date_to, default_days=30)
    begin, finish = _dt_range(start, end)
    records = []

    if breakdown == 'sub_affiliate':
        children = list(Affiliate.objects.filter(parent_id=affiliate.id))
        child_ids = [c.id for c in children]
        clicks = dict(
            AffiliateClick.objects.filter(
                affiliate_id__in=child_ids, created_at__gte=begin, created_at__lt=finish
            ).values('affiliate_id').annotate(n=Count('id'))
            .values_list('affiliate_id', 'n')
        )
        refs = {
            r['affiliate_id']: r
            for r in AffiliateReferral.objects.filter(
                affiliate_id__in=child_ids, attributed_at__gte=begin,
                attributed_at__lt=finish,
            ).values('affiliate_id').annotate(
                signups=Count('id'),
                ftds=Count('id', filter=Q(first_deposit_at__isnull=False)),
            )
        }
        overrides = dict(
            AffiliateCommissionLedger.objects.filter(
                affiliate_id=affiliate.id, source_affiliate_id__in=child_ids,
                period_start__gte=start, period_start__lte=end,
            ).values('source_affiliate_id').annotate(total=Sum('amount'))
            .values_list('source_affiliate_id', 'total')
        )
        for child in children:
            stats = refs.get(child.id, {})
            records.append({
                'label': child.name,
                'sub_label': child.code,
                'clicks': clicks.get(child.id, 0),
                'signups': stats.get('signups', 0),
                'ftds': stats.get('ftds', 0),
                'commission': f(overrides.get(child.id) or 0),
            })

    elif breakdown == 'country':
        referrals = AffiliateReferral.objects.filter(
            affiliate_id=affiliate.id, attributed_at__gte=begin, attributed_at__lt=finish
        )
        countries = dict(
            User.objects.filter(id__in=referrals.values_list('user_id', flat=True))
            .values_list('id', 'country_code')
        )
        buckets = {}
        for referral in referrals:
            key = countries.get(referral.user_id) or 'Unknown'
            bucket = buckets.setdefault(
                key, {'label': key, 'clicks': 0, 'signups': 0, 'ftds': 0,
                      'commission': 0.0}
            )
            bucket['signups'] += 1
            if referral.first_deposit_at:
                bucket['ftds'] += 1
            bucket['commission'] += float(referral.lifetime_commission or 0)
        # Clicks carry a country code of their own, independent of whether the
        # visitor ever registered.
        for row in AffiliateClick.objects.filter(
            affiliate_id=affiliate.id, created_at__gte=begin, created_at__lt=finish
        ).values('country_code').annotate(n=Count('id')):
            key = row['country_code'] or 'Unknown'
            bucket = buckets.setdefault(
                key, {'label': key, 'clicks': 0, 'signups': 0, 'ftds': 0,
                      'commission': 0.0}
            )
            bucket['clicks'] = row['n']
        records = sorted(buckets.values(), key=lambda r: -r['signups'])

    else:  # by link
        links = list(AffiliateLink.objects.filter(affiliate_id=affiliate.id))
        link_ids = [link.id for link in links]
        clicks = dict(
            AffiliateClick.objects.filter(
                link_id__in=link_ids, created_at__gte=begin, created_at__lt=finish
            ).values('link_id').annotate(n=Count('id')).values_list('link_id', 'n')
        )
        refs = {
            r['link_id']: r
            for r in AffiliateReferral.objects.filter(
                affiliate_id=affiliate.id, link_id__in=link_ids,
                attributed_at__gte=begin, attributed_at__lt=finish,
            ).values('link_id').annotate(
                signups=Count('id'),
                ftds=Count('id', filter=Q(first_deposit_at__isnull=False)),
                commission=Sum('lifetime_commission'),
            )
        }
        for link in links:
            stats = refs.get(link.id, {})
            records.append({
                'label': link.name,
                'sub_label': link.sub_id or link.code,
                'clicks': clicks.get(link.id, 0),
                'signups': stats.get('signups', 0),
                'ftds': stats.get('ftds', 0),
                'commission': f(stats.get('commission') or 0),
            })

    return {
        'records': records,
        'total': len(records),
        'breakdown': breakdown,
        'range': {'from': start.isoformat(), 'to': end.isoformat()},
        'summary': {
            'clicks': sum(r['clicks'] for r in records),
            'signups': sum(r['signups'] for r in records),
            'ftds': sum(r['ftds'] for r in records),
            'commission': round(sum(r['commission'] for r in records), 2),
        },
    }


def reports_csv_rows(affiliate: Affiliate, *, breakdown='link', date_from=None,
                     date_to=None):
    data = get_reports(affiliate, breakdown=breakdown, date_from=date_from,
                       date_to=date_to)
    label = {'link': 'Link', 'sub_affiliate': 'Sub-affiliate',
             'country': 'Country'}.get(breakdown, 'Label')
    yield [label, 'Reference', 'Clicks', 'Signups', 'First deposits', 'Commission']
    for row in data['records']:
        yield [row['label'], row.get('sub_label', ''), row['clicks'], row['signups'],
               row['ftds'], row['commission']]


# ---------------------------------------------------------------------------
# Profile and security
# ---------------------------------------------------------------------------

def get_profile(affiliate: Affiliate) -> dict:
    return serialize_affiliate(affiliate)


def update_profile(affiliate: Affiliate, payload: dict) -> dict:
    """Update the affiliate's own details.

    Deliberately narrow: commission rate, status, tier and parent are staff-only
    and are simply not in this list, so a crafted request body cannot reach them.
    """
    fields = []
    if 'companyName' in payload:
        affiliate.company_name = (payload['companyName'] or '').strip() or None
        fields.append('company_name')
    if 'contactName' in payload and (payload['contactName'] or '').strip():
        affiliate.name = payload['contactName'].strip()
        fields.append('name')
    if 'contactPhone' in payload:
        affiliate.phone = (payload['contactPhone'] or '').strip() or None
        fields.append('phone')
    if 'timezone' in payload and (payload['timezone'] or '').strip():
        affiliate.timezone = payload['timezone'].strip()
        fields.append('timezone')
    if 'notificationPreferences' in payload and isinstance(
        payload['notificationPreferences'], dict
    ):
        affiliate.notification_prefs = payload['notificationPreferences']
        fields.append('notification_prefs')

    if fields:
        fields.append('updated_at')
        affiliate.save(update_fields=fields)
        audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'profile.updated',
              actor_id=affiliate.id, after={k: payload.get(k) for k in payload})
    return serialize_affiliate(affiliate)


def change_password(affiliate: Affiliate, current_password: str,
                    new_password: str) -> dict:
    if not affiliate.password_hash or not _check_password(
        current_password, affiliate.password_hash
    ):
        raise ValueError('Your current password is incorrect.')
    if not new_password or len(new_password) < 8:
        raise ValueError('New password must be at least 8 characters')
    if current_password == new_password:
        raise ValueError('Choose a password different from your current one.')

    affiliate.password_hash = hash_password(new_password)
    affiliate.save(update_fields=['password_hash', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'profile.password_changed',
          actor_id=affiliate.id)
    return {'changed': True}


def start_two_factor(affiliate: Affiliate) -> dict:
    """Issue an enrolment secret.

    Stored immediately but not switched on: ``two_factor_enabled`` only flips
    once a code proves the affiliate really scanned it. Enabling first would
    lock out anyone whose scan failed.
    """
    if affiliate.two_factor_enabled:
        raise ValueError('Two-factor authentication is already enabled.')
    secret = new_totp_secret()
    affiliate.two_factor_secret = secret
    affiliate.save(update_fields=['two_factor_secret', 'updated_at'])
    return {
        'secret': secret,
        'otpauth_uri': totp_uri(secret, affiliate.email or affiliate.code),
    }


def enable_two_factor(affiliate: Affiliate, code: str) -> dict:
    if affiliate.two_factor_enabled:
        raise ValueError('Two-factor authentication is already enabled.')
    if not affiliate.two_factor_secret:
        raise ValueError('Start the setup again to get a fresh code.')
    if not verify_totp(affiliate.two_factor_secret, code):
        raise ValueError('That code is not valid. Check your authenticator and retry.')

    affiliate.two_factor_enabled = True
    affiliate.two_factor_confirmed_at = timezone.now()
    affiliate.save(update_fields=['two_factor_enabled', 'two_factor_confirmed_at',
                                  'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'security.2fa_enabled',
          actor_id=affiliate.id)
    return {'enabled': True}


def disable_two_factor(affiliate: Affiliate, password: str, code: str) -> dict:
    """Turn 2FA off. Requires both the password and a live code — either alone
    would let whoever holds it strip the second factor."""
    if not affiliate.two_factor_enabled:
        raise ValueError('Two-factor authentication is not enabled.')
    if not affiliate.password_hash or not _check_password(password, affiliate.password_hash):
        raise ValueError('Your password is incorrect.')
    if not verify_totp(affiliate.two_factor_secret, code):
        raise ValueError('That code is not valid.')

    affiliate.two_factor_enabled = False
    affiliate.two_factor_secret = None
    affiliate.two_factor_confirmed_at = None
    affiliate.save(update_fields=['two_factor_enabled', 'two_factor_secret',
                                  'two_factor_confirmed_at', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'security.2fa_disabled',
          actor_id=affiliate.id)
    return {'enabled': False}


# ---------------------------------------------------------------------------
# Partner API keys
# ---------------------------------------------------------------------------

def _new_keypair():
    """Generate an RSA keypair. The private half is returned, never stored."""
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_der = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    digest = hashes.Hash(hashes.SHA256())
    digest.update(public_der)
    fingerprint = digest.finalize().hex()
    return private_pem, public_pem, fingerprint


def list_api_keys(affiliate: Affiliate) -> dict:
    keys = AffiliateApiKey.objects.filter(
        affiliate_id=affiliate.id
    ).order_by('-created_at')
    return {'records': [serialize_api_key(k) for k in keys], 'total': keys.count()}


def create_api_key(affiliate: Affiliate) -> dict:
    """Issue a keypair.

    ``private_pem`` appears in this response and nowhere else, ever — it is not
    written to the database and not logged. If the affiliate loses it they
    rotate; there is no recovery path, by design.
    """
    if AffiliateApiKey.objects.filter(
        affiliate_id=affiliate.id, status=AffiliateApiKey.Status.ACTIVE
    ).count() >= 3:
        raise ValueError('You already have the maximum of 3 active keys. '
                         'Revoke one before creating another.')

    private_pem, public_pem, fingerprint = _new_keypair()
    key = AffiliateApiKey.objects.create(
        affiliate_id=affiliate.id,
        key_id=f'afk_{secrets.token_hex(16)}',
        public_pem=public_pem,
        fingerprint=fingerprint,
        status=AffiliateApiKey.Status.ACTIVE,
    )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'api_key.created',
          actor_id=affiliate.id, target=f'key:{key.key_id}')
    payload = serialize_api_key(key)
    payload['private_pem'] = private_pem
    payload['private_pem_notice'] = (
        'This is the only time the private key is shown. Store it securely — '
        'it cannot be recovered.'
    )
    return payload


def rotate_api_key(affiliate: Affiliate, key_id: int, grace_hours: int = 24) -> dict:
    """Issue a replacement and put the old key into a grace window.

    The overlap is the point: revoking instantly would break every in-flight
    request a partner's integration has already signed.
    """
    old = AffiliateApiKey.objects.filter(
        id=key_id, affiliate_id=affiliate.id
    ).exclude(status=AffiliateApiKey.Status.REVOKED).first()
    if not old:
        raise ValueError('Key not found')

    private_pem, public_pem, fingerprint = _new_keypair()
    with tenant_atomic():
        old.status = AffiliateApiKey.Status.ROTATING
        old.grace_until = timezone.now() + timedelta(hours=grace_hours)
        old.save(update_fields=['status', 'grace_until'])
        new_key = AffiliateApiKey.objects.create(
            affiliate_id=affiliate.id,
            key_id=f'afk_{secrets.token_hex(16)}',
            public_pem=public_pem,
            fingerprint=fingerprint,
            status=AffiliateApiKey.Status.ACTIVE,
        )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'api_key.rotated',
          actor_id=affiliate.id, target=f'key:{new_key.key_id}',
          before={'key_id': old.key_id}, after={'grace_until': _iso(old.grace_until)})
    payload = serialize_api_key(new_key)
    payload['private_pem'] = private_pem
    payload['rotated_from'] = old.key_id
    payload['grace_until'] = _iso(old.grace_until)
    return payload


def revoke_api_key(affiliate: Affiliate, key_id: int) -> dict:
    key = AffiliateApiKey.objects.filter(id=key_id, affiliate_id=affiliate.id).first()
    if not key:
        raise ValueError('Key not found')
    key.status = AffiliateApiKey.Status.REVOKED
    key.revoked_at = timezone.now()
    key.grace_until = None
    key.save(update_fields=['status', 'revoked_at', 'grace_until'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'api_key.revoked',
          actor_id=affiliate.id, target=f'key:{key.key_id}')
    return serialize_api_key(key)


def get_webhook_config(affiliate: Affiliate) -> dict:
    return {
        'webhook_url': affiliate.webhook_url,
        'postback_endpoint': f'{api_base_url()}/api/v1/affiliate/webhook/postback',
        'data_endpoint': f'{api_base_url()}/api/v1/affiliate/data/<resource>',
        'headers': ['X-Aff-Key-Id', 'X-Aff-Timestamp', 'X-Aff-Nonce', 'X-Aff-Signature'],
        # Set once outbound delivery ships; until then the UI says so rather
        # than implying events are already being pushed.
        'outbound_enabled': False,
    }


def set_webhook_config(affiliate: Affiliate, webhook_url: str) -> dict:
    url = (webhook_url or '').strip()
    if url and not url.startswith('https://'):
        raise ValueError('Webhook URL must use HTTPS.')
    affiliate.webhook_url = url or None
    affiliate.save(update_fields=['webhook_url', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'webhook.configured',
          actor_id=affiliate.id, after={'webhook_url': url})
    return get_webhook_config(affiliate)


def list_api_logs(affiliate: Affiliate, limit: int = 25, offset: int = 0) -> dict:
    qs = AffiliateApiLog.objects.filter(affiliate_id=affiliate.id).order_by('-created_at')
    total = qs.count()
    return {
        'records': [
            {
                'id': row.id,
                'key_id': row.key_id,
                'direction': row.direction,
                'endpoint': row.endpoint,
                'method': row.method,
                'status_code': row.status_code,
                'signature_result': row.signature_result,
                'note': row.note,
                'created_at': _iso(row.created_at),
            }
            for row in qs[offset:offset + limit]
        ],
        'total': total,
        'limit': limit,
        'offset': offset,
    }


# ---------------------------------------------------------------------------
# Notifications and support
# ---------------------------------------------------------------------------

def list_notifications(affiliate: Affiliate, *, unread_only=False, limit=50,
                       offset=0) -> dict:
    qs = Notification.objects.filter(affiliate_id=affiliate.id)
    if unread_only:
        qs = qs.filter(is_read=False)
    qs = qs.order_by('-created_at')
    total = qs.count()
    unread = Notification.objects.filter(
        affiliate_id=affiliate.id, is_read=False
    ).count()
    return {
        'records': [serialize_notification(n) for n in qs[offset:offset + limit]],
        'total': total,
        'unread': unread,
        'limit': limit,
        'offset': offset,
    }


def mark_notification(affiliate: Affiliate, notification_id: int,
                      is_read: bool = True) -> dict:
    updated = Notification.objects.filter(
        id=notification_id, affiliate_id=affiliate.id
    ).update(is_read=is_read)
    if not updated:
        raise ValueError('Notification not found')
    return {'updated': True, 'unread': Notification.objects.filter(
        affiliate_id=affiliate.id, is_read=False).count()}


def mark_all_notifications_read(affiliate: Affiliate) -> dict:
    Notification.objects.filter(
        affiliate_id=affiliate.id, is_read=False
    ).update(is_read=True)
    return {'updated': True, 'unread': 0}


def clear_notifications(affiliate: Affiliate) -> dict:
    deleted, _ = Notification.objects.filter(affiliate_id=affiliate.id).delete()
    return {'deleted': deleted, 'unread': 0}


def list_tickets(affiliate: Affiliate, *, status=None, limit=50, offset=0) -> dict:
    qs = AffiliateSupportTicket.objects.filter(affiliate_id=affiliate.id)
    if status and status != 'all':
        qs = qs.filter(status=status)
    qs = qs.order_by('-created_at')
    total = qs.count()
    tickets = list(qs[offset:offset + limit])
    counts = dict(
        AffiliateTicketMessage.objects.filter(
            ticket_id__in=[t.id for t in tickets], is_internal=False
        ).values('ticket_id').annotate(n=Count('id')).values_list('ticket_id', 'n')
    ) if tickets else {}
    return {
        'records': [serialize_ticket(t, counts.get(t.id, 0)) for t in tickets],
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def create_ticket(affiliate: Affiliate, *, subject, message, category='other',
                  priority='normal') -> dict:
    subject = (subject or '').strip()
    message = (message or '').strip()
    if not subject:
        raise ValueError('A subject is required')
    if not message:
        raise ValueError('Describe the issue so support can help')
    if category not in dict(AffiliateSupportTicket.Category.choices):
        category = AffiliateSupportTicket.Category.OTHER
    if priority not in dict(AffiliateSupportTicket.Priority.choices):
        priority = AffiliateSupportTicket.Priority.NORMAL

    with tenant_atomic():
        ticket = AffiliateSupportTicket.objects.create(
            affiliate_id=affiliate.id, subject=subject,
            category=category, priority=priority,
        )
        AffiliateTicketMessage.objects.create(
            ticket_id=ticket.id,
            sender_type=AffiliateTicketMessage.SenderType.AFFILIATE,
            sender_id=affiliate.id,
            message=message,
        )
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'support.ticket_created',
          actor_id=affiliate.id, target=f'ticket:{ticket.id}')
    return serialize_ticket(ticket, 1)


def get_ticket(affiliate: Affiliate, ticket_id: int) -> dict:
    ticket = AffiliateSupportTicket.objects.filter(
        id=ticket_id, affiliate_id=affiliate.id
    ).first()
    if not ticket:
        raise ValueError('Ticket not found')
    # Internal staff notes are filtered out here, not in the client.
    messages = AffiliateTicketMessage.objects.filter(
        ticket_id=ticket.id, is_internal=False
    ).order_by('created_at')
    return {
        'ticket': serialize_ticket(ticket, messages.count()),
        'messages': [
            {
                'id': m.id, 'sender_type': m.sender_type, 'message': m.message,
                'created_at': _iso(m.created_at),
            }
            for m in messages
        ],
    }


def add_ticket_message(affiliate: Affiliate, ticket_id: int, message: str) -> dict:
    ticket = AffiliateSupportTicket.objects.filter(
        id=ticket_id, affiliate_id=affiliate.id
    ).first()
    if not ticket:
        raise ValueError('Ticket not found')
    message = (message or '').strip()
    if not message:
        raise ValueError('Message cannot be empty')
    if ticket.status == AffiliateSupportTicket.Status.CLOSED:
        raise ValueError('This ticket is closed. Please open a new one.')

    with tenant_atomic():
        row = AffiliateTicketMessage.objects.create(
            ticket_id=ticket.id,
            sender_type=AffiliateTicketMessage.SenderType.AFFILIATE,
            sender_id=affiliate.id,
            message=message,
        )
        # A reply reopens a resolved ticket so it returns to the staff queue.
        if ticket.status in (AffiliateSupportTicket.Status.RESOLVED,
                             AffiliateSupportTicket.Status.PENDING_AFFILIATE):
            ticket.status = AffiliateSupportTicket.Status.OPEN
            ticket.save(update_fields=['status', 'updated_at'])
    return {'id': row.id, 'created_at': _iso(row.created_at)}


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------

def get_onboarding(affiliate: Affiliate) -> dict:
    docs = AffiliateKycDocument.objects.filter(affiliate_id=affiliate.id)
    has_method = AffiliatePayoutMethod.objects.filter(affiliate_id=affiliate.id).exists()
    has_link = AffiliateLink.objects.filter(affiliate_id=affiliate.id).exists()
    return {
        'steps': {
            'terms': bool(affiliate.terms_accepted_at),
            'payout': has_method,
            'kyc': docs.exists(),
            'link': has_link,
        },
        'complete': affiliate.onboarding_complete,
        'code': affiliate.code,
        'tracking_url': tracking_url(affiliate.code),
        'kyc_status': affiliate.kyc_status,
        'documents': [serialize_kyc_document(d) for d in docs],
    }


def accept_terms(affiliate: Affiliate, *, ip=None) -> dict:
    if not affiliate.terms_accepted_at:
        affiliate.terms_accepted_at = timezone.now()
        affiliate.save(update_fields=['terms_accepted_at', 'updated_at'])
        audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE,
              'onboarding.terms_accepted', actor_id=affiliate.id, ip=ip)
    return {'accepted': True, 'accepted_at': _iso(affiliate.terms_accepted_at)}


def upload_kyc_document(affiliate: Affiliate, *, document_type, file_url,
                        original_name=None) -> dict:
    if document_type not in dict(AffiliateKycDocument.DocumentType.choices):
        raise ValueError('Choose a valid document type.')
    doc = AffiliateKycDocument.objects.create(
        affiliate_id=affiliate.id, document_type=document_type,
        file_url=file_url, original_name=original_name,
    )
    if affiliate.kyc_status in (Affiliate.KycStatus.NONE, Affiliate.KycStatus.REJECTED):
        affiliate.kyc_status = Affiliate.KycStatus.PENDING
        affiliate.save(update_fields=['kyc_status', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'onboarding.kyc_uploaded',
          actor_id=affiliate.id, target=f'document:{doc.id}',
          after={'document_type': document_type})
    return serialize_kyc_document(doc)


def complete_onboarding(affiliate: Affiliate) -> dict:
    """Finish onboarding.

    Terms and a payout method are required; KYC is not. Verification takes staff
    time, and gating the dashboard on it would leave a newly approved partner
    staring at a wall while they wait. Payouts still check KYC separately.
    """
    if not affiliate.terms_accepted_at:
        raise ValueError('Please accept the partner terms first.')
    if not AffiliatePayoutMethod.objects.filter(affiliate_id=affiliate.id).exists():
        raise ValueError('Please add a payout method first.')

    if not AffiliateLink.objects.filter(affiliate_id=affiliate.id).exists():
        create_link(affiliate, name='Default tracking link', target_path='/')

    affiliate.onboarding_complete = True
    affiliate.save(update_fields=['onboarding_complete', 'updated_at'])
    audit(affiliate.id, AffiliateAuditLog.ActorType.AFFILIATE, 'onboarding.completed',
          actor_id=affiliate.id)
    return {'complete': True, 'code': affiliate.code,
            'tracking_url': tracking_url(affiliate.code)}
