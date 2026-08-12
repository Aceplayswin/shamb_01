"""ORM models for the affiliate program.

Split out of ``core/models.py`` because this is a distinct trust boundary — an
affiliate is neither a player nor staff — and because these 18 models would
otherwise roughly double that file. ``core/models.py`` re-exports everything
here, so ``from core.models import Affiliate`` keeps working.

Two rules make that re-export safe and must not be broken:

* nothing here imports from ``core.models`` — cross-model references use the
  lazy string form ``'core.User'``, so the import at the bottom of that file
  cannot become circular;
* every model declares ``app_label = 'core'`` explicitly, since Django cannot
  infer it from a module that is not the app's ``models`` module.

Tables come from ``database/init.sql`` / ``database/migrations/002_affiliate_program.sql``
(migrations are disabled product-wide via ``MIGRATION_MODULES``), so field
definitions here describe existing columns rather than create them.
"""

from django.db import models

__all__ = [
    'Affiliate',
    'AffiliateLink',
    'AffiliateClick',
    'AffiliateReferral',
    'AffiliateCommissionLedger',
    'AffiliatePayout',
    'AffiliatePayoutMethod',
    'AffiliateApiKey',
    'AffiliateApiNonce',
    'AffiliateApiLog',
    'AffiliateCreative',
    'AffiliateKycDocument',
    'AffiliateSupportTicket',
    'AffiliateTicketMessage',
    'AffiliateFraudFlag',
    'AffiliateAuditLog',
    'AffiliateLoginChallenge',
    'AffiliateCommissionRun',
    'Notification',
]


class Affiliate(models.Model):
    """An external marketing partner with a login to the affiliate portal.

    Affiliates are deliberately not rows in ``users``: that table's role column
    is ``ENUM('user','admin')``, and mixing a third actor into the player
    identity table would put affiliate ids and player ids in one namespace.
    They authenticate against ``password_hash`` here and carry ``role='affiliate'``
    in their JWT, so ``request.auth.sub`` is an ``affiliates.id``.

    Commission columns default to 0, which every read path treats as "inherit
    the platform default" (see ``affiliate_services.get_program_settings``).
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        INFO_REQUESTED = 'info_requested', 'Info requested'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        SUSPENDED = 'suspended', 'Suspended'

    class CommissionType(models.TextChoices):
        REVENUE_SHARE = 'revenue_share', 'Revenue share'
        CPA = 'cpa', 'CPA'
        HYBRID = 'hybrid', 'Hybrid'

    class KycStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=255, null=True, blank=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    company_name = models.CharField(max_length=150, null=True, blank=True)

    # Network depth: 1 = direct partner, 2 = recruited by a partner, and so on.
    commission_tier = models.IntegerField(default=1)
    # Loyalty band shown in the admin console. A different axis entirely from
    # commission_tier; both were called "tier" during design, hence two names.
    tier_label = models.CharField(max_length=20, default='Bronze')

    commission_type = models.CharField(
        max_length=20,
        choices=CommissionType.choices,
        default=CommissionType.REVENUE_SHARE,
    )
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    cpa_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    hybrid_cpa_days = models.IntegerField(default=0)
    # What this affiliate's PARENT earns on this affiliate's commission.
    override_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='parent_affiliate_id',
        related_name='children',
    )

    total_referrals = models.IntegerField(default=0)
    total_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    payout_threshold = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    # Display caches, refreshed by the commission run and payout transitions.
    pending_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    approved_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    paid_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    # A day whose NGR came out negative is carried so the next positive day nets
    # it off before commission is earned.
    ngr_carry_forward = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=64, null=True, blank=True)
    two_factor_confirmed_at = models.DateTimeField(null=True, blank=True)
    kyc_status = models.CharField(
        max_length=20, choices=KycStatus.choices, default=KycStatus.NONE
    )
    onboarding_complete = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, default='Asia/Kolkata')
    currency = models.CharField(max_length=10, default='INR')
    notification_prefs = models.JSONField(null=True, blank=True)
    webhook_url = models.CharField(max_length=500, null=True, blank=True)

    # Application fields, captured by the public apply form.
    traffic_source = models.CharField(max_length=60, null=True, blank=True)
    expected_volume = models.CharField(max_length=40, null=True, blank=True)
    payment_preference = models.CharField(max_length=40, null=True, blank=True)
    application_notes = models.TextField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=500, null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.BigIntegerField(null=True, blank=True)

    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliates'


class AffiliateLink(models.Model):
    """A named tracking link. ``code`` is the token that appears in /r/<code>."""

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    sub_id = models.CharField(max_length=60, null=True, blank=True)
    target_path = models.CharField(max_length=255, default='/')
    is_active = models.BooleanField(default=True)
    clicks_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_links'


class AffiliateClick(models.Model):
    """Raw click log. The highest-volume table in the program — the daily
    command purges rows past the configured retention window."""

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    link = models.ForeignKey(
        AffiliateLink,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='link_id',
    )
    sub_id = models.CharField(max_length=60, null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    referrer_url = models.CharField(max_length=500, null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    converted = models.BooleanField(default=False)
    converted_user_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_clicks'


class AffiliateReferral(models.Model):
    """One row per referred player.

    ``user`` is unique: a player belongs to exactly one affiliate forever, which
    is what makes a repeated attribution call a harmless no-op rather than a
    double-count.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DORMANT = 'dormant', 'Dormant'
        BLOCKED = 'blocked', 'Blocked'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    user = models.OneToOneField(
        'core.User', on_delete=models.CASCADE, db_column='user_id'
    )
    link_id = models.BigIntegerField(null=True, blank=True)
    click_id = models.BigIntegerField(null=True, blank=True)
    sub_id = models.CharField(max_length=60, null=True, blank=True)
    attributed_at = models.DateTimeField(null=True, blank=True)
    # Stamped once, by record_deposit, on the first confirmed deposit. The null
    # check is what keeps that idempotent.
    first_deposit_at = models.DateTimeField(null=True, blank=True)
    first_deposit_amount = models.DecimalField(
        max_digits=18, decimal_places=2, default=0
    )
    first_deposit_tx_id = models.BigIntegerField(null=True, blank=True)
    deposit_count = models.IntegerField(default=0)
    lifetime_deposits = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    lifetime_ngr = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    lifetime_commission = models.DecimalField(
        max_digits=18, decimal_places=2, default=0
    )
    cpa_paid = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    last_active_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_referrals'


class AffiliateCommissionLedger(models.Model):
    """Every rupee an affiliate earns, one row at a time.

    ``dedupe_key`` is unique per affiliate and is computed by the commission
    engine from (entry type, period, referral, source affiliate). Re-running a
    period updates still-pending rows in place and refuses to touch anything
    already approved or paid — that constraint is the whole idempotency story.

    ``referral_id`` / ``source_affiliate_id`` / ``payout_id`` / ``run_id`` are
    plain integers rather than FKs, matching the soft-reference convention used
    elsewhere in this schema, so a clawback or backfill can point at a row whose
    parent has since been removed.
    """

    class EntryType(models.TextChoices):
        REVENUE_SHARE = 'revenue_share', 'Revenue share'
        CPA = 'cpa', 'CPA'
        OVERRIDE = 'override', 'Override'
        ADJUSTMENT = 'adjustment', 'Adjustment'
        CLAWBACK = 'clawback', 'Clawback'

    class BaseKind(models.TextChoices):
        NGR = 'ngr', 'Net gaming revenue'
        FTD = 'ftd', 'First deposit'
        NETWORK_COMMISSION = 'network_commission', 'Network commission'
        MANUAL = 'manual', 'Manual'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        PAID = 'paid', 'Paid'
        REJECTED = 'rejected', 'Rejected'
        CLAWED_BACK = 'clawed_back', 'Clawed back'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    referral_id = models.BigIntegerField(null=True, blank=True)
    # For override entries: the sub-affiliate whose earnings this is a cut of.
    source_affiliate_id = models.BigIntegerField(null=True, blank=True)
    entry_type = models.CharField(max_length=20, choices=EntryType.choices)
    base_kind = models.CharField(max_length=20, choices=BaseKind.choices)
    base_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    period_start = models.DateField()
    period_end = models.DateField()
    payout_id = models.BigIntegerField(null=True, blank=True)
    run_id = models.BigIntegerField(null=True, blank=True)
    dedupe_key = models.CharField(max_length=120)
    notes = models.CharField(max_length=255, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_commission_ledger'
        unique_together = (('affiliate', 'dedupe_key'),)


class AffiliatePayout(models.Model):
    """A withdrawal of approved commission. Paid by hand initially, matching how
    player withdrawals are handled today."""

    class Status(models.TextChoices):
        REQUESTED = 'requested', 'Requested'
        APPROVED = 'approved', 'Approved'
        PAID = 'paid', 'Paid'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    method_id = models.BigIntegerField(null=True, blank=True)
    # Snapshotted at request time so history stays readable after a method is
    # edited or deleted.
    method_label = models.CharField(max_length=120, null=True, blank=True)
    method_details = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.REQUESTED
    )
    reference = models.CharField(max_length=120, null=True, blank=True)
    rejection_reason = models.CharField(max_length=500, null=True, blank=True)
    requested_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.BigIntegerField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_payouts'


class AffiliatePayoutMethod(models.Model):
    class MethodType(models.TextChoices):
        BANK = 'bank', 'Bank'
        UPI = 'upi', 'UPI'
        CRYPTO = 'crypto', 'Crypto'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    method_type = models.CharField(max_length=20, choices=MethodType.choices)
    label = models.CharField(max_length=80, null=True, blank=True)
    details = models.JSONField()
    # Pre-masked at write time so list views never have to touch `details`.
    masked_details = models.CharField(max_length=120, null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_payout_methods'


class AffiliateApiKey(models.Model):
    """Public half of a partner's signing keypair.

    There is no private-key column and there never should be: the private half
    is returned to the affiliate once, at generation, and is not persisted.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        ROTATING = 'rotating', 'Rotating'
        REVOKED = 'revoked', 'Revoked'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    key_id = models.CharField(max_length=64, unique=True)
    public_pem = models.TextField()
    fingerprint = models.CharField(max_length=64, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    last_used_at = models.DateTimeField(null=True, blank=True)
    # A rotating key keeps verifying until this moment, so in-flight partner
    # requests do not break the instant a new key is issued.
    grace_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_api_keys'


class AffiliateApiNonce(models.Model):
    """Replay protection for signed partner requests.

    Deliberately a table and not the cache: CACHES is LocMemCache, which is
    per-process, so a cache-backed nonce store stops working the moment there is
    more than one worker — silently, which is the worst kind.
    """

    id = models.BigAutoField(primary_key=True)
    key_id = models.CharField(max_length=64)
    nonce = models.CharField(max_length=96)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_api_nonces'
        unique_together = (('key_id', 'nonce'),)


class AffiliateApiLog(models.Model):
    """Signed-request audit trail, surfaced in the portal's API screen so a
    partner can debug their own integration without asking support."""

    class Direction(models.TextChoices):
        INBOUND = 'inbound', 'Inbound'
        OUTBOUND = 'outbound', 'Outbound'

    class SignatureResult(models.TextChoices):
        VALID = 'valid', 'Valid'
        INVALID = 'invalid', 'Invalid'
        MISSING = 'missing', 'Missing'
        REPLAY = 'replay', 'Replay'
        EXPIRED = 'expired', 'Expired'
        REVOKED = 'revoked', 'Revoked'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='affiliate_id',
    )
    key_id = models.CharField(max_length=64, null=True, blank=True)
    direction = models.CharField(
        max_length=10, choices=Direction.choices, default=Direction.INBOUND
    )
    endpoint = models.CharField(max_length=255, null=True, blank=True)
    method = models.CharField(max_length=10, null=True, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    signature_result = models.CharField(
        max_length=20, choices=SignatureResult.choices, null=True, blank=True
    )
    note = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_api_logs'


class AffiliateCreative(models.Model):
    """Shared banner library — no affiliate_id, same as `banners`. Staff upload
    once and every partner can download."""

    class AssetType(models.TextChoices):
        BANNER = 'banner', 'Banner'
        LOGO = 'logo', 'Logo'
        VIDEO = 'video', 'Video'

    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=150)
    asset_type = models.CharField(
        max_length=20, choices=AssetType.choices, default=AssetType.BANNER
    )
    file_url = models.CharField(max_length=500)
    thumbnail_url = models.CharField(max_length=500, null=True, blank=True)
    dimensions = models.CharField(max_length=20, null=True, blank=True)
    size_label = models.CharField(max_length=40, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_creatives'


class AffiliateKycDocument(models.Model):
    """Separate from `kyc_documents`, whose user_id is NOT NULL with an FK to
    users — an affiliate has no users row — and whose document_type enum cannot
    express a company registration."""

    class DocumentType(models.TextChoices):
        ID_PROOF = 'id_proof', 'ID proof'
        ADDRESS_PROOF = 'address_proof', 'Address proof'
        COMPANY_REGISTRATION = 'company_registration', 'Company registration'
        TAX_CERTIFICATE = 'tax_certificate', 'Tax certificate'
        BANK_PROOF = 'bank_proof', 'Bank proof'
        SELFIE = 'selfie', 'Selfie'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file_url = models.CharField(max_length=500, null=True, blank=True)
    original_name = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    rejection_reason = models.TextField(null=True, blank=True)
    reviewed_by = models.BigIntegerField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_kyc_documents'


class AffiliateSupportTicket(models.Model):
    """Separate from `support_tickets` for the same reason as KYC documents."""

    class Category(models.TextChoices):
        PAYOUT = 'payout', 'Payout'
        COMMISSION = 'commission', 'Commission'
        TRACKING = 'tracking', 'Tracking'
        ACCOUNT = 'account', 'Account'
        API = 'api', 'API'
        OTHER = 'other', 'Other'

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In progress'
        PENDING_AFFILIATE = 'pending_affiliate', 'Pending affiliate'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    subject = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    assigned_to = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_support_tickets'


class AffiliateTicketMessage(models.Model):
    class SenderType(models.TextChoices):
        AFFILIATE = 'affiliate', 'Affiliate'
        STAFF = 'staff', 'Staff'
        SYSTEM = 'system', 'System'

    id = models.BigAutoField(primary_key=True)
    ticket = models.ForeignKey(
        AffiliateSupportTicket, on_delete=models.CASCADE, db_column='ticket_id'
    )
    sender_type = models.CharField(max_length=20, choices=SenderType.choices)
    sender_id = models.BigIntegerField(null=True, blank=True)
    message = models.TextField()
    # Staff-only note: never serialized to the affiliate-facing thread.
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_ticket_messages'


class AffiliateFraudFlag(models.Model):
    """A suspicious signal on a referral or an affiliate.

    Flags never block a sign-up — a false positive must not cost the product a
    player. What they do is gate commission auto-approval, so a human looks at
    the money before it moves.
    """

    class RiskLevel(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        DISMISSED = 'dismissed', 'Dismissed'
        ACTIONED = 'actioned', 'Actioned'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    referral_id = models.BigIntegerField(null=True, blank=True)
    reason = models.CharField(max_length=255)
    rule_key = models.CharField(max_length=60, null=True, blank=True)
    risk_level = models.CharField(
        max_length=20, choices=RiskLevel.choices, default=RiskLevel.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    metadata = models.JSONField(null=True, blank=True)
    resolved_by = models.BigIntegerField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_fraud_flags'


class AffiliateAuditLog(models.Model):
    """Who did what to an affiliate account.

    Dedicated rather than reusing `admin_audit_logs`, which FKs admin_id to
    users and therefore cannot record an action an affiliate took on their own
    account.
    """

    class ActorType(models.TextChoices):
        AFFILIATE = 'affiliate', 'Affiliate'
        STAFF = 'staff', 'Staff'
        SYSTEM = 'system', 'System'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='affiliate_id',
    )
    actor_type = models.CharField(max_length=20, choices=ActorType.choices)
    actor_id = models.BigIntegerField(null=True, blank=True)
    actor_label = models.CharField(max_length=80, null=True, blank=True)
    action = models.CharField(max_length=120)
    target = models.CharField(max_length=160, null=True, blank=True)
    before_value = models.JSONField(null=True, blank=True)
    after_value = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_audit_logs'


class AffiliateLoginChallenge(models.Model):
    """A short-lived handle for the second step of login, or a password reset.

    A row rather than a short-expiry JWT: ``auth_jwt.sign_token`` hardcodes a
    7-day expiry for every token in the product, and a row can carry an attempt
    counter — which is what stops a six-digit TOTP code being brute-forced.
    """

    class Purpose(models.TextChoices):
        TWO_FACTOR = '2fa', 'Two-factor'
        RESET = 'reset', 'Password reset'

    id = models.BigAutoField(primary_key=True)
    affiliate = models.ForeignKey(
        Affiliate, on_delete=models.CASCADE, db_column='affiliate_id'
    )
    challenge_token = models.CharField(max_length=64, unique=True)
    purpose = models.CharField(max_length=10, choices=Purpose.choices)
    attempts = models.IntegerField(default=0)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_login_challenges'


class AffiliateCommissionRun(models.Model):
    """One row per commission run, so the admin console can report what a run
    actually did instead of just claiming it succeeded."""

    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    class TriggerSource(models.TextChoices):
        CRON = 'cron', 'Cron'
        ADMIN = 'admin', 'Admin'

    id = models.BigAutoField(primary_key=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RUNNING
    )
    trigger_source = models.CharField(
        max_length=10, choices=TriggerSource.choices, default=TriggerSource.CRON
    )
    triggered_by = models.BigIntegerField(null=True, blank=True)
    entries_written = models.IntegerField(default=0)
    entries_skipped = models.IntegerField(default=0)
    entries_approved = models.IntegerField(default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    error = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'core'
        db_table = 'affiliate_commission_runs'


class Notification(models.Model):
    """In-app notification for exactly one of a player, a staff member or an
    affiliate. The table shipped with init.sql from the start but had no model
    until the affiliate portal needed a notifications feed."""

    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(null=True, blank=True)
    admin_id = models.BigIntegerField(null=True, blank=True)
    affiliate_id = models.BigIntegerField(null=True, blank=True)
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=255, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'notifications'
