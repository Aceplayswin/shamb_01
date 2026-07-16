from django.db import models


class User(models.Model):
    class Role(models.TextChoices):
        USER = 'user', 'User'
        ADMIN = 'admin', 'Admin'
        SUPER_ADMIN = 'super_admin', 'Super Admin'

    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        SUSPENDED = 'suspended', 'Suspended'
        BLOCKED = 'blocked', 'Blocked'

    id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    full_name = models.CharField(max_length=100, null=True, blank=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.USER, db_index=True
    )
    account_status = models.CharField(
        max_length=20, choices=AccountStatus.choices, default=AccountStatus.ACTIVE
    )
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    @property
    def is_staff(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.SUPER_ADMIN)


class UserSetting(models.Model):
    """Per-player profile, verification, and preferences (role=user only)."""

    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'
        PREFER_NOT_TO_SAY = 'prefer_not_to_say', 'Prefer not to say'

    class KycStatus(models.TextChoices):
        NONE = 'none', 'None'
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    class RegistrationPath(models.TextChoices):
        OTP = 'otp', 'OTP'
        KYC = 'kyc', 'KYC'

    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20, choices=Gender.choices, null=True, blank=True
    )
    kyc_status = models.CharField(
        max_length=20, choices=KycStatus.choices, default=KycStatus.NONE
    )
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, null=True, blank=True)
    affiliate_id = models.BigIntegerField(null=True, blank=True)
    agent_id = models.BigIntegerField(null=True, blank=True)
    # Referral chain: this player's own shareable code + who referred them.
    referral_code = models.CharField(max_length=20, null=True, blank=True)
    referred_by = models.BigIntegerField(null=True, blank=True)
    fraud_score = models.IntegerField(default=0)
    is_demo = models.BooleanField(default=False)
    demo_expires_at = models.DateTimeField(null=True, blank=True)
    website_language = models.CharField(max_length=10, default='en')
    communication_language = models.CharField(max_length=10, default='en')
    currency = models.CharField(max_length=10, default='INR')
    registration_path = models.CharField(
        max_length=10, choices=RegistrationPath.choices, default=RegistrationPath.OTP
    )
    preferred_game_type = models.CharField(max_length=50, null=True, blank=True)
    typical_bet_range = models.CharField(max_length=20, null=True, blank=True)
    ai_voice_executive_id = models.CharField(max_length=50, null=True, blank=True)
    notifications_enabled = models.BooleanField(default=True)
    marketing_opt_in = models.BooleanField(default=False)
    settings = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_settings'


class Wallet(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column='user_id')
    main_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    bonus_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    exposure_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    locked_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    # Outstanding wagering requirement (legacy tbl_requiredplay_balance). Must be
    # cleared by net gameplay before the user can withdraw. Updated by game
    # callback settlement; see core/game_services.py.
    wagering_balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
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

    id = models.BigAutoField(primary_key=True)
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

    id = models.BigAutoField(primary_key=True)
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
    id = models.BigAutoField(primary_key=True)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, db_column='transaction_id'
    )
    stage = models.CharField(max_length=50)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'withdrawal_stages'


class GameProvider(models.Model):
    id = models.BigAutoField(primary_key=True)
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

    id = models.BigAutoField(primary_key=True)
    provider = models.ForeignKey(
        GameProvider, on_delete=models.SET_NULL, null=True, db_column='provider_id'
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=100, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    # External aggregator identifier (32-char hex UID). The launch + callback
    # flow keys on this; it maps aggregator events back to this catalog row.
    game_uid = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    # Aggregator-side game type label (e.g. "Slot Game", "CasinoTable") kept for
    # catalog filtering/display alongside the normalized `category`.
    game_type = models.CharField(max_length=40, null=True, blank=True)
    thumbnail_url = models.URLField(max_length=500, null=True, blank=True)
    rtp = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_bet = models.DecimalField(max_digits=18, decimal_places=2, default=10)
    max_bet = models.DecimalField(max_digits=18, decimal_places=2, default=100000)
    is_featured = models.BooleanField(default=False)
    is_active_web = models.BooleanField(default=True)
    # Per-game launch toggle (independent of the global GAME_STATUS setting).
    is_active = models.BooleanField(default=True)
    is_provably_fair = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    play_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'games'


class GameSession(models.Model):
    """One game-launch session per user+game. Tracks the issued launch URL and
    accumulates settlement totals from the aggregator's bet/win callbacks
    (replaces the legacy tblmatchplayed row-per-session behaviour)."""

    class Status(models.TextChoices):
        WAIT = 'wait', 'Wait'
        PROFIT = 'profit', 'Profit'
        LOSS = 'loss', 'Loss'

    id = models.BigAutoField(primary_key=True)
    # Public, opaque session reference returned to clients / used in order ids.
    session_uid = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(
        Game, on_delete=models.SET_NULL, null=True, db_column='game_id'
    )
    # Denormalized aggregator UID + name so settlement can match by UID and
    # history stays readable even if the catalog row is later removed.
    game_uid = models.CharField(max_length=64, db_index=True)
    game_name = models.CharField(max_length=150)
    member_account = models.CharField(max_length=100, db_index=True)
    launch_url = models.TextField(null=True, blank=True)
    currency = models.CharField(max_length=10, default='INR')
    # Accumulated settlement totals across all rounds in this session.
    total_bet = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_win = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    profit_loss = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    rounds_count = models.IntegerField(default=0)
    last_balance = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.WAIT
    )
    last_played_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'game_sessions'


class GameRound(models.Model):
    """A single settled bet/win event from the aggregator. The aggregator's
    `serial_number` is the idempotency key — a unique constraint makes duplicate
    callback delivery a no-op at the database level."""

    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        GameSession, on_delete=models.CASCADE, null=True, db_column='session_id'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(
        Game, on_delete=models.SET_NULL, null=True, db_column='game_id'
    )
    game_uid = models.CharField(max_length=64, db_index=True)
    # Aggregator idempotency key (unique). Unique round id from the aggregator.
    serial_number = models.CharField(max_length=100, unique=True)
    game_round = models.CharField(max_length=100, null=True, blank=True)
    bet_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    win_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    balance_before = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    balance_after = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    currency = models.CharField(max_length=10, default='INR')
    provider_timestamp = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'game_rounds'


class GameCallbackLog(models.Model):
    """Raw audit log of every inbound aggregator callback (replaces the legacy
    bet_logs.txt file). Stores the raw + decrypted payloads and the processing
    outcome for forensics and replay debugging."""

    class Result(models.TextChoices):
        SETTLED = 'settled', 'Settled'
        DUPLICATE = 'duplicate', 'Duplicate'
        HEARTBEAT = 'heartbeat', 'Heartbeat'
        ERROR = 'error', 'Error'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    serial_number = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    member_account = models.CharField(max_length=100, null=True, blank=True)
    game_uid = models.CharField(max_length=64, null=True, blank=True)
    raw_payload = models.TextField(null=True, blank=True)
    decrypted_payload = models.JSONField(null=True, blank=True)
    result = models.CharField(max_length=20, choices=Result.choices)
    message = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'game_callback_logs'


class Bet(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        WON = 'won', 'Won'
        LOST = 'lost', 'Lost'
        VOID = 'void', 'Void'
        CANCELLED = 'cancelled', 'Cancelled'
        CASHOUT = 'cashout', 'Cashout'

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(Game, on_delete=models.SET_NULL, null=True, db_column='game_id')
    bet_amount = models.DecimalField(max_digits=18, decimal_places=2)
    odds = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    payout = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bets'


class Bonus(models.Model):
    """A fully controllable, money-based bonus campaign.

    Each ``bonus_type`` is a distinct engine wired to a money event — joining
    credits on registration, deposit matches a confirmed deposit, referral pays
    the referrer, game/cashback rebates net losses, manual is admin-pushed. All
    of them share the same value/limit/wagering controls below.
    """

    class Type(models.TextChoices):
        JOINING = 'joining', 'Joining / Welcome'
        DEPOSIT = 'deposit', 'Deposit match'
        REFERRAL = 'referral', 'Referral'
        GAME = 'game', 'Game / Play'
        CASHBACK = 'cashback', 'Cashback'
        NO_DEPOSIT = 'no_deposit', 'No deposit'
        FREE_SPINS = 'free_spins', 'Free spins'
        LOYALTY = 'loyalty', 'Loyalty'
        RELOAD = 'reload', 'Reload'
        MANUAL = 'manual', 'Manual grant'

    class ValueType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Percentage'
        FIXED = 'fixed', 'Fixed'

    class CreditTarget(models.TextChoices):
        BONUS = 'bonus', 'Bonus balance'
        MAIN = 'main', 'Main balance'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        EXPIRED = 'expired', 'Expired'

    class ClaimMethod(models.TextChoices):
        AUTO = 'auto', 'Automatic'
        MANUAL = 'manual', 'Manual'
        CODE = 'code', 'Promo code'
        OPT_IN = 'opt_in', 'Opt in'

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    display_title = models.CharField(max_length=150, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    bonus_type = models.CharField(max_length=20, choices=Type.choices)
    value_type = models.CharField(max_length=20, choices=ValueType.choices)
    value_amount = models.DecimalField(max_digits=18, decimal_places=2)
    min_deposit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    max_bonus_cap = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    referrer_reward = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    wagering_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=35)
    credit_target = models.CharField(
        max_length=10, choices=CreditTarget.choices, default=CreditTarget.BONUS
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    claim_method = models.CharField(
        max_length=10, choices=ClaimMethod.choices, default=ClaimMethod.AUTO
    )
    promo_code = models.CharField(max_length=40, null=True, blank=True)
    per_user_limit = models.IntegerField(null=True, blank=True)
    total_budget = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    total_awarded = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_claims = models.IntegerField(default=0)
    bonus_validity_days = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bonuses'


class UserBonus(models.Model):
    """A bonus instance actually awarded to a player — the money-side ledger."""

    class Source(models.TextChoices):
        JOINING = 'joining', 'Joining'
        DEPOSIT = 'deposit', 'Deposit'
        REFERRAL = 'referral', 'Referral'
        GAME = 'game', 'Game'
        CASHBACK = 'cashback', 'Cashback'
        PROMO = 'promo', 'Promo code'
        MANUAL = 'manual', 'Manual'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'
        FORFEITED = 'forfeited', 'Forfeited'

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    bonus = models.ForeignKey(
        Bonus, on_delete=models.SET_NULL, db_column='bonus_id', null=True, blank=True
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    wagering_required = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    wagering_completed = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit_target = models.CharField(max_length=10, default='bonus')
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    transaction_id = models.BigIntegerField(null=True, blank=True)
    granted_by = models.BigIntegerField(null=True, blank=True)
    notes = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_bonuses'


class PlatformSetting(models.Model):
    id = models.BigAutoField(primary_key=True)
    setting_key = models.CharField(max_length=100, unique=True)
    setting_value = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings'


class Banner(models.Model):
    """Home-page hero carousel banner, managed by this product's own admin."""

    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=150, null=True, blank=True)
    image_url = models.CharField(max_length=500)
    link_url = models.CharField(max_length=500, null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'banners'


class AiCallLog(models.Model):
    id = models.BigAutoField(primary_key=True)
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
