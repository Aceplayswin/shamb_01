from django.db import models


class User(models.Model):
    class Role(models.TextChoices):
        USER = 'user', 'User'
        ADMIN = 'admin', 'Admin'

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
        return self.role == self.Role.ADMIN


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
        DIRECT = 'direct', 'Direct'
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
        max_length=10, choices=RegistrationPath.choices, default=RegistrationPath.DIRECT
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
    """An aggregator/vendor. Credentials are optional per-provider overrides.

    Most providers ride the platform-wide aggregator account configured in
    ``settings.GAME_PROVIDER``. A provider that is integrated separately (a
    lottery vendor on its own agency account, a second aggregator, …) fills in
    the columns below; anything left blank falls back to the global env config.
    See ``services/game_provider.get_config``.
    """

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    logo_url = models.URLField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    # --- Per-provider aggregator credentials (all optional overrides) ---
    agency_uid = models.CharField(max_length=100, null=True, blank=True)
    aes_secret_key = models.CharField(max_length=128, null=True, blank=True)
    server_url = models.CharField(max_length=255, null=True, blank=True)
    launch_path = models.CharField(max_length=100, null=True, blank=True)
    player_prefix = models.CharField(max_length=40, null=True, blank=True)
    callback_path = models.CharField(max_length=100, null=True, blank=True)
    currency_code = models.CharField(max_length=10, null=True, blank=True)
    # Sports/lottery style vendors settle long after the stake is taken. Rounds
    # from these providers stay Pending in bet history until the result lands.
    delayed_settlement = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'game_providers'

    @property
    def has_custom_credentials(self) -> bool:
        return bool(self.agency_uid or self.aes_secret_key or self.server_url)


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
    # Rounds staked but not yet resolved by the provider (sports/lottery). While
    # this is non-zero the session stays WAIT instead of showing a premature loss.
    pending_rounds = models.IntegerField(default=0)
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

    class SettleStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SETTLED = 'settled', 'Settled'

    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        GameSession, on_delete=models.CASCADE, null=True, db_column='session_id'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(
        Game, on_delete=models.SET_NULL, null=True, db_column='game_id'
    )
    game_uid = models.CharField(max_length=64, db_index=True)
    # The game actually played. For a lobby launch (Ezugi/Microgaming) the
    # aggregator reports the specific table here, not the lobby the player
    # entered through, so history stays readable.
    game_name = models.CharField(max_length=150, null=True, blank=True)
    # Aggregator idempotency key (unique). Unique round id from the aggregator.
    serial_number = models.CharField(max_length=100, unique=True)
    game_round = models.CharField(max_length=100, null=True, blank=True)
    # Stake-only rounds from a delayed-settlement provider stay PENDING until
    # the result callback arrives; they must not be shown as a loss meanwhile.
    settle_status = models.CharField(
        max_length=10, choices=SettleStatus.choices, default=SettleStatus.SETTLED,
        db_index=True,
    )
    settled_at = models.DateTimeField(null=True, blank=True)
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

    class Scope(models.TextChoices):
        MASS = 'mass', 'All eligible players'
        TARGETED = 'targeted', 'Single account'

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    display_title = models.CharField(max_length=150, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    bonus_type = models.CharField(max_length=20, choices=Type.choices)
    value_type = models.CharField(max_length=20, choices=ValueType.choices)
    value_amount = models.DecimalField(max_digits=18, decimal_places=2)
    min_deposit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    # Deposit-sequence gates. None set = any deposit qualifies; setting several
    # makes the bonus fire on any of those ordinals.
    is_first_deposit = models.BooleanField(default=False)
    is_second_deposit = models.BooleanField(default=False)
    is_third_deposit = models.BooleanField(default=False)
    # Restricts the bonus to accounts registered within new_player_days.
    is_new_player_only = models.BooleanField(default=False)
    new_player_days = models.IntegerField(default=7)
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
    scope = models.CharField(max_length=10, choices=Scope.choices, default=Scope.MASS)
    target_user_id = models.BigIntegerField(null=True, blank=True)
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
        PENDING = 'pending', 'Pending — wagering in progress'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'
        FORFEITED = 'forfeited', 'Forfeited'

    class AwardMode(models.TextChoices):
        # Legacy: credited into bonus_balance at award time, burns down
        # wallet.wagering_balance. Only pre-existing rows carry this.
        LOCKED = 'locked', 'Locked balance (legacy)'
        # Current: owed but uncredited until wagering_completed hits the target.
        PENDING = 'pending', 'Pending reward'

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    bonus = models.ForeignKey(
        Bonus, on_delete=models.SET_NULL, db_column='bonus_id', null=True, blank=True
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    wagering_required = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    wagering_completed = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit_target = models.CharField(max_length=10, default='bonus')
    award_mode = models.CharField(
        max_length=10, choices=AwardMode.choices, default=AwardMode.LOCKED
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    transaction_id = models.BigIntegerField(null=True, blank=True)
    granted_by = models.BigIntegerField(null=True, blank=True)
    notes = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_bonuses'


class BonusProvider(models.Model):
    """A per-provider wagering multiplier override for one bonus.

    Risk balancing: a slot provider (high house edge) can clear at 15x while a
    live-casino provider (near coin-flip) demands 50x, so a player cannot grind
    the requirement cheaply on low-edge games. Absent a row for the provider a
    bet falls back to ``Bonus.wagering_multiplier``.
    """

    id = models.BigAutoField(primary_key=True)
    bonus = models.ForeignKey(
        Bonus, on_delete=models.CASCADE, db_column='bonus_id', related_name='provider_rules'
    )
    provider = models.ForeignKey(
        GameProvider, on_delete=models.CASCADE, db_column='provider_id'
    )
    wagering_multiplier = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bonus_providers'
        unique_together = (('bonus', 'provider'),)


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


class Faq(models.Model):
    """Home-page FAQ entry, managed by this product's own admin. Only rows with
    status='active' are served to the public frontends, ordered by sort_order."""

    id = models.BigAutoField(primary_key=True)
    question = models.CharField(max_length=300)
    answer = models.TextField()
    sort_order = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faqs'


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


# Affiliate program models live in their own module (a separate trust boundary,
# and ~18 models that would otherwise double this file). Re-exported here so
# `from core.models import Affiliate` keeps working alongside every other model.
# The import is last and one-directional: core/affiliate_models.py imports
# nothing from here, using lazy 'core.User' references instead.
from core.affiliate_models import *  # noqa: E402,F401,F403
