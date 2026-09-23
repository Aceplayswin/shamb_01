"""Models for the backoffice-parity tables added in migration 009.

These back the reference backoffice screens that had no store on this platform:
staff groups/permissions, mailing and the cashier system. Player-facing tables
stay in core.models; this module holds only what the management console owns.
"""

from django.db import models

from core.models import User


class StaffGroup(models.Model):
    """A named permission group a backoffice user belongs to."""

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'staff_groups'


class StaffGroupPermission(models.Model):
    """One granted permission. Presence of the row is the grant."""

    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(
        StaffGroup, on_delete=models.CASCADE, db_column='group_id',
        related_name='permissions',
    )
    module = models.CharField(max_length=60)
    permission = models.CharField(max_length=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'staff_group_permissions'
        unique_together = (('group', 'module', 'permission'),)


class MailTemplate(models.Model):
    class Channel(models.TextChoices):
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        BOTH = 'both', 'Both'

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=120)
    subject = models.CharField(max_length=255, null=True, blank=True)
    channel = models.CharField(
        max_length=10, choices=Channel.choices, default=Channel.EMAIL
    )
    language = models.CharField(max_length=10, default='en')
    body = models.TextField(null=True, blank=True)
    # Trigger that fires this template, e.g. 'signup', 'deposit_success'.
    event_key = models.CharField(max_length=60, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mail_templates'


class MailConfiguration(models.Model):
    """Key/value behind the Casino and Email_SMS configuration screens."""

    class Scope(models.TextChoices):
        CASINO = 'casino', 'Casino'
        EMAIL_SMS = 'email_sms', 'Email/SMS'

    id = models.BigAutoField(primary_key=True)
    scope = models.CharField(max_length=20, choices=Scope.choices)
    config_key = models.CharField(max_length=80)
    config_value = models.TextField(null=True, blank=True)
    updated_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mail_configurations'
        unique_together = (('scope', 'config_key'),)


class PaymentMethod(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=80)
    code = models.CharField(max_length=40, unique=True)
    method_type = models.CharField(max_length=20, default='other')
    logo_url = models.CharField(max_length=500, null=True, blank=True)
    supports_deposit = models.BooleanField(default=True)
    supports_withdrawal = models.BooleanField(default=False)
    min_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    max_amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    currencies = models.CharField(max_length=255, null=True, blank=True)
    countries = models.TextField(null=True, blank=True)
    # Destination account shown to the player for a manual deposit.
    account_name = models.CharField(max_length=120, null=True, blank=True)
    account_number = models.CharField(max_length=64, null=True, blank=True)
    ifsc_code = models.CharField(max_length=20, null=True, blank=True)
    bank_name = models.CharField(max_length=120, null=True, blank=True)
    branch_name = models.CharField(max_length=120, null=True, blank=True)
    upi_id = models.CharField(max_length=120, null=True, blank=True)
    qr_image_url = models.CharField(max_length=500, null=True, blank=True)
    # Crypto methods: which chain/token the player must use, and the address.
    crypto_network = models.CharField(max_length=40, null=True, blank=True)
    wallet_address = models.CharField(max_length=191, null=True, blank=True)
    instructions = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_methods'


class PaymentProvider(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=80)
    code = models.CharField(max_length=40, unique=True)
    api_endpoint = models.CharField(max_length=500, null=True, blank=True)
    # Non-secret config only; secrets belong in the platform secret store.
    credentials = models.JSONField(null=True, blank=True)
    supports_deposit = models.BooleanField(default=True)
    supports_withdrawal = models.BooleanField(default=False)
    deposit_countries = models.TextField(null=True, blank=True)
    withdrawal_countries = models.TextField(null=True, blank=True)
    currencies = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_providers'


class PaymentProviderMethod(models.Model):
    """Which methods a provider processes, and its fee for each."""

    id = models.BigAutoField(primary_key=True)
    provider = models.ForeignKey(
        PaymentProvider, on_delete=models.CASCADE, db_column='provider_id',
        related_name='methods',
    )
    method = models.ForeignKey(
        PaymentMethod, on_delete=models.CASCADE, db_column='method_id'
    )
    fee_percent = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    fee_fixed = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_provider_methods'
        unique_together = (('provider', 'method'),)


class PaymentBinRule(models.Model):
    """Routes or blocks a card BIN range."""

    class Action(models.TextChoices):
        ALLOW = 'allow', 'Allow'
        DENY = 'deny', 'Deny'
        ROUTE = 'route', 'Route'

    id = models.BigAutoField(primary_key=True)
    provider = models.ForeignKey(
        PaymentProvider, on_delete=models.SET_NULL, null=True, blank=True,
        db_column='provider_id',
    )
    bin_from = models.CharField(max_length=8)
    bin_to = models.CharField(max_length=8, null=True, blank=True)
    card_brand = models.CharField(max_length=40, null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    action = models.CharField(
        max_length=10, choices=Action.choices, default=Action.ALLOW
    )
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_bin_rules'


class PaymentFrontendRule(models.Model):
    """Which method shows to whom, in what order, on the cashier front end."""

    id = models.BigAutoField(primary_key=True)
    method = models.ForeignKey(
        PaymentMethod, on_delete=models.CASCADE, null=True, blank=True,
        db_column='method_id',
    )
    country_code = models.CharField(max_length=2, null=True, blank=True)
    currency = models.CharField(max_length=10, null=True, blank=True)
    min_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    max_amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    display_order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_frontend_rules'


class CashierQueueItem(models.Model):
    """Decline Queue and Profile Upgrade Queue.

    Both screens are identical apart from the label, so `queue_type` keeps them
    in one table.
    """

    class QueueType(models.TextChoices):
        DECLINE = 'decline', 'Decline'
        PROFILE_UPGRADE = 'profile_upgrade', 'Profile Upgrade'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    queue_type = models.CharField(max_length=20, choices=QueueType.choices)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, db_column='user_id'
    )
    transaction_id = models.BigIntegerField(null=True, blank=True)
    amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    currency = models.CharField(max_length=10, default='INR')
    reason = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    assigned_to = models.BigIntegerField(null=True, blank=True)
    resolved_by = models.BigIntegerField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cashier_queue_items'


class BlockedIp(models.Model):
    """Pre-existing table; modelled here because migration 009 extended it."""

    class Status(models.TextChoices):
        BLOCK = 'block', 'Block'
        ALLOW = 'allow', 'Allow'

    id = models.BigAutoField(primary_key=True)
    ip_address = models.CharField(max_length=45, unique=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.BLOCK
    )
    reason = models.CharField(max_length=100, null=True, blank=True)
    comments = models.CharField(max_length=255, null=True, blank=True)
    blocked_by = models.BigIntegerField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_permanent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blocked_ips'


class LoginHistory(models.Model):
    """Pre-existing table; backs the Player Login Report and Players Online."""

    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(null=True, blank=True)
    admin_id = models.BigIntegerField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_history'


class BonusExcludedAffiliate(models.Model):
    """Bars one affiliate's referrals from a bonus.

    No rows for a bonus means every affiliate is eligible.
    """

    id = models.BigAutoField(primary_key=True)
    bonus_id = models.BigIntegerField()
    affiliate_id = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bonus_excluded_affiliates'
        unique_together = (('bonus_id', 'affiliate_id'),)


class BonusTranslation(models.Model):
    """Player-facing marketing copy for a bonus, one row per language.

    Backs the reference's Coupon Sets tab.
    """

    id = models.BigAutoField(primary_key=True)
    bonus_id = models.BigIntegerField()
    language = models.CharField(max_length=10, default='en')
    title = models.CharField(max_length=150, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    image_url = models.CharField(max_length=500, null=True, blank=True)
    terms_conditions = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bonus_translations'
        unique_together = (('bonus_id', 'language'),)
