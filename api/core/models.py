import uuid

from django.db import models


def uuid_str():
    return str(uuid.uuid4())


class User(models.Model):
    class RegistrationPath(models.TextChoices):
        OTP = 'otp', 'OTP'
        KYC = 'kyc', 'KYC'

    class KycStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        SUSPENDED = 'suspended', 'Suspended'
        BLOCKED = 'blocked', 'Blocked'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    full_name = models.CharField(max_length=100, null=True, blank=True)
    country_code = models.CharField(max_length=2, default='IN')
    currency = models.CharField(max_length=10, default='INR')
    website_language = models.CharField(max_length=10, default='en')
    communication_language = models.CharField(max_length=10, default='en')
    registration_path = models.CharField(
        max_length=10, choices=RegistrationPath.choices, default=RegistrationPath.OTP
    )
    kyc_status = models.CharField(
        max_length=20, choices=KycStatus.choices, default=KycStatus.NONE
    )
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    account_status = models.CharField(
        max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE
    )
    is_demo = models.BooleanField(default=False)
    demo_expires_at = models.DateTimeField(null=True, blank=True)
    ai_voice_executive_id = models.CharField(max_length=50, null=True, blank=True)
    fraud_score = models.IntegerField(default=0)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'


class Wallet(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    main_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    bonus_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    exposure_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    locked_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='INR')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wallets'


class OtpVerification(models.Model):
    class Channel(models.TextChoices):
        SMS = 'sms', 'SMS'
        WHATSAPP = 'whatsapp', 'WhatsApp'
        TELEGRAM = 'telegram', 'Telegram'
        VOICE = 'voice', 'Voice'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    phone = models.CharField(max_length=20, db_index=True)
    otp_hash = models.CharField(max_length=255)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.SMS)
    attempts = models.IntegerField(default=0)
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_verifications'


class Transaction(models.Model):
    class TxType(models.TextChoices):
        DEPOSIT = 'deposit', 'Deposit'
        WITHDRAWAL = 'withdrawal', 'Withdrawal'
        BONUS_CREDIT = 'bonus_credit', 'Bonus Credit'
        BET_SETTLEMENT = 'bet_settlement', 'Bet Settlement'
        REFUND = 'refund', 'Refund'
        ADJUSTMENT = 'adjustment', 'Adjustment'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REJECTED = 'rejected', 'Rejected'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    type = models.CharField(max_length=20, choices=TxType.choices)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=50, null=True, blank=True)
    reference_number = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transactions'


class WithdrawalStage(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, db_column='transaction_id'
    )
    stage = models.CharField(max_length=50)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'withdrawal_stages'


class GameProvider(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    logo_url = models.URLField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'game_providers'


class Game(models.Model):
    class Category(models.TextChoices):
        SLOTS = 'slots', 'Slots'
        LIVE_CASINO = 'live_casino', 'Live Casino'
        SPORTS = 'sports', 'Sports'
        LOTTERY = 'lottery', 'Lottery'
        AI_GAMES = 'ai_games', 'AI Games'
        FANTASY = 'fantasy', 'Fantasy'
        VIRTUAL_SPORTS = 'virtual_sports', 'Virtual Sports'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    provider = models.ForeignKey(
        GameProvider, on_delete=models.SET_NULL, null=True, db_column='provider_id'
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=100, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    thumbnail_url = models.URLField(max_length=500, null=True, blank=True)
    rtp = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_bet = models.DecimalField(max_digits=18, decimal_places=2, default=10)
    max_bet = models.DecimalField(max_digits=18, decimal_places=2, default=100000)
    is_featured = models.BooleanField(default=False)
    is_active_web = models.BooleanField(default=True)
    is_provably_fair = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    play_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'games'


class Bet(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        WON = 'won', 'Won'
        LOST = 'lost', 'Lost'
        VOID = 'void', 'Void'
        CANCELLED = 'cancelled', 'Cancelled'
        CASHOUT = 'cashout', 'Cashout'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(Game, on_delete=models.SET_NULL, null=True, db_column='game_id')
    bet_amount = models.DecimalField(max_digits=18, decimal_places=2)
    odds = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    payout = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bets'


class AdminUser(models.Model):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        FINANCE_MANAGER = 'finance_manager', 'Finance Manager'
        SUPPORT_LEAD = 'support_lead', 'Support Lead'
        SUPPORT_AGENT = 'support_agent', 'Support Agent'
        MARKETING_MANAGER = 'marketing_manager', 'Marketing Manager'
        RISK_MANAGER = 'risk_manager', 'Risk Manager'
        GAME_MANAGER = 'game_manager', 'Game Manager'
        REPORTING_ANALYST = 'reporting_analyst', 'Reporting Analyst'

    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=30, choices=Role.choices)
    two_factor_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_users'


class Bonus(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    name = models.CharField(max_length=100)
    display_title = models.CharField(max_length=150, null=True, blank=True)
    bonus_type = models.CharField(max_length=20)
    value_type = models.CharField(max_length=20)
    value_amount = models.DecimalField(max_digits=10, decimal_places=2)
    min_deposit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    max_bonus_cap = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    wagering_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=35)
    status = models.CharField(max_length=20, default='draft')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bonuses'


class PlatformSetting(models.Model):
    setting_key = models.CharField(primary_key=True, max_length=100)
    setting_value = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings'


class AiCallLog(models.Model):
    id = models.CharField(primary_key=True, max_length=36, default=uuid_str, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    voice_executive_id = models.CharField(max_length=50, null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    transcript = models.TextField(null=True, blank=True)
    deposit_intent = models.BooleanField(default=False)
    deposit_amount = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(max_length=20, default='completed')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_call_logs'
