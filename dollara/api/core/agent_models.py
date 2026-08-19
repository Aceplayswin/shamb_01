"""ORM models for the agent panel.

Split out of ``core/models.py`` for the same two reasons ``affiliate_models.py``
was: an agent is a distinct trust boundary — not a player, not staff, not a
marketing partner — and these models would otherwise crowd a file that is
already the biggest in the app. ``core/models.py`` re-exports everything here,
so ``from core.models import Agent`` keeps working.

Two rules make that re-export safe and must not be broken:

* nothing here imports from ``core.models`` — cross-model references use the
  lazy string form ``'core.User'``, so the import at the bottom of that file
  cannot become circular;
* every model declares ``app_label = 'core'`` explicitly, since Django cannot
  infer it from a module that is not the app's ``models`` module.

Tables come from ``database/init.sql`` / ``database/migrations/003_agent_panel.sql``
(migrations are disabled product-wide via ``MIGRATION_MODULES``), so field
definitions here describe existing columns rather than create them.
"""

from django.db import models

__all__ = [
    'Agent',
    'AgentTransfer',
    'AgentSettlement',
    'AgentAuditLog',
    'SportEvent',
    'SportMarket',
    'SportBet',
]


class Agent(models.Model):
    """A downline operator with a login to the agent panel.

    Agents are not rows in ``users``: that table's role column is
    ``ENUM('user','admin')``, and an agent id sharing a namespace with a player
    id is exactly the confusion ``user_settings.agent_id`` would then invite.
    They authenticate against ``password_hash`` here and carry ``role='agent'``
    in their JWT, so ``request.auth.sub`` is an ``agents.id``.

    ``tree_path`` is the load-bearing column on this model. Every report the
    panel serves is scoped to "this agent and everything below it", which is a
    single ``tree_path__startswith`` against an indexed column — see
    :func:`core.agent_services.downline_ids`.
    """

    class Level(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        ADMIN = 'admin', 'Admin'
        SUPER_MASTER = 'super_master', 'Super Master'
        MASTER = 'master', 'Master'
        AGENT = 'agent', 'Agent'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        SUSPENDED = 'suspended', 'Suspended'
        LOCKED = 'locked', 'Locked'
        CLOSED = 'closed', 'Closed'

    # Ordered top-down. An agent may only create accounts strictly below its
    # own level, which is a list-index comparison rather than a rules table.
    LEVEL_ORDER = [
        Level.SUPER_ADMIN,
        Level.ADMIN,
        Level.SUPER_MASTER,
        Level.MASTER,
        Level.AGENT,
    ]

    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(null=True, blank=True)
    code = models.CharField(max_length=20, unique=True)
    username = models.CharField(max_length=50, unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        db_column='parent_agent_id', related_name='children',
    )
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.AGENT)
    depth = models.IntegerField(default=1)
    tree_path = models.CharField(max_length=255, null=True, blank=True)

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    commission_type = models.CharField(max_length=20, default='revenue_share')
    credit_reference = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    exposure = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    partnership = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    total_players = models.IntegerField(default=0)
    total_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    settled_pl = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    unsettled_pl = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    pending_commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    bet_locked = models.BooleanField(default=False)
    user_locked = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)

    timezone = models.CharField(max_length=64, default='Asia/Kolkata')
    currency = models.CharField(max_length=10, default='INR')
    contact_email = models.CharField(max_length=255, null=True, blank=True)
    contact_phone = models.CharField(max_length=20, null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.CharField(max_length=45, null=True, blank=True)
    created_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'agents'

    def __str__(self):
        return f'{self.username or self.code} ({self.level})'

    @property
    def available_credit(self):
        """Balance not already committed to unsettled bets.

        Derived rather than stored: a fourth money column would have to be kept
        in step with every bet placement and settlement, and would be wrong the
        moment one of those paths forgot.
        """
        return (self.balance or 0) - (self.exposure or 0)

    @property
    def can_create_below(self) -> list[str]:
        """Levels this agent may open accounts at — everything strictly below."""
        try:
            index = self.LEVEL_ORDER.index(self.level)
        except ValueError:
            return []
        return [str(value) for value in self.LEVEL_ORDER[index + 1:]]


class AgentTransfer(models.Model):
    """One credit movement between an agent and one account below it.

    Written once, never updated — the Transfer Statement is an append-only
    ledger, and a mutable row there would make yesterday's statement disagree
    with yesterday's balances.
    """

    class CounterpartyType(models.TextChoices):
        AGENT = 'agent', 'Agent'
        PLAYER = 'player', 'Player'

    class Direction(models.TextChoices):
        # Named from the performing agent's point of view, which is the way the
        # panel labels its own totals ("Balance Down" / "Balance Up").
        DOWN = 'down', 'Credit down'
        UP = 'up', 'Credit up'

    id = models.BigAutoField(primary_key=True)
    agent = models.ForeignKey(
        Agent, on_delete=models.CASCADE, db_column='agent_id',
        related_name='transfers',
    )
    counterparty_type = models.CharField(
        max_length=10, choices=CounterpartyType.choices
    )
    counterparty_id = models.BigIntegerField()
    direction = models.CharField(max_length=10, choices=Direction.choices)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    agent_balance_after = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    counterparty_balance_after = models.DecimalField(
        max_digits=18, decimal_places=2, null=True, blank=True
    )
    remark = models.CharField(max_length=255, null=True, blank=True)
    performed_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'agent_transfers'


class AgentSettlement(models.Model):
    """A settled P&L balance between an agent and one account below it.

    ``amount`` is signed from the agent's side: positive means the counterparty
    owed the agent and has now paid.
    """

    class CounterpartyType(models.TextChoices):
        AGENT = 'agent', 'Agent'
        PLAYER = 'player', 'Player'

    id = models.BigAutoField(primary_key=True)
    agent = models.ForeignKey(
        Agent, on_delete=models.CASCADE, db_column='agent_id',
        related_name='settlements',
    )
    counterparty_type = models.CharField(
        max_length=10, choices=CounterpartyType.choices
    )
    counterparty_id = models.BigIntegerField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    pl_before = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    pl_after = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    note = models.CharField(max_length=255, null=True, blank=True)
    settled_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'agent_settlements'


class AgentAuditLog(models.Model):
    """Everything an agent does to an account below it."""

    class TargetType(models.TextChoices):
        AGENT = 'agent', 'Agent'
        PLAYER = 'player', 'Player'
        MARKET = 'market', 'Market'
        SETTLEMENT = 'settlement', 'Settlement'
        SESSION = 'session', 'Session'

    id = models.BigAutoField(primary_key=True)
    agent = models.ForeignKey(
        Agent, on_delete=models.CASCADE, db_column='agent_id',
        related_name='audit_logs',
    )
    actor_id = models.BigIntegerField(null=True, blank=True)
    actor_label = models.CharField(max_length=100, null=True, blank=True)
    action = models.CharField(max_length=60)
    target_type = models.CharField(
        max_length=20, choices=TargetType.choices, null=True, blank=True
    )
    target_id = models.BigIntegerField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'agent_audit_logs'


# ---------------------------------------------------------------------------
# Exchange sportsbook
# ---------------------------------------------------------------------------

class SportEvent(models.Model):
    """A fixture. ``sport`` is free text because the feed's sport list grows."""

    class Status(models.TextChoices):
        UPCOMING = 'upcoming', 'Upcoming'
        IN_PLAY = 'in_play', 'In play'
        CLOSED = 'closed', 'Closed'
        SETTLED = 'settled', 'Settled'
        ABANDONED = 'abandoned', 'Abandoned'

    id = models.BigAutoField(primary_key=True)
    sport = models.CharField(max_length=40)
    event_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    name = models.CharField(max_length=200)
    competition = models.CharField(max_length=150, null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.UPCOMING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'sport_events'

    def __str__(self):
        return self.name


class SportMarket(models.Model):
    """One market on an event — what the panel groups its P&L report by."""

    class MarketType(models.TextChoices):
        MATCH_ODDS = 'match_odds', 'Match Odds'
        BOOKMAKER = 'bookmaker', 'Bookmaker'
        FANCY = 'fancy', 'Fancy'
        TOSS = 'toss', 'Toss'
        TIED_MATCH = 'tied_match', 'Tied Match'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        SUSPENDED = 'suspended', 'Suspended'
        CLOSED = 'closed', 'Closed'
        SETTLED = 'settled', 'Settled'

    id = models.BigAutoField(primary_key=True)
    event = models.ForeignKey(
        SportEvent, on_delete=models.CASCADE, db_column='event_id',
        related_name='markets',
    )
    market_key = models.CharField(max_length=64, null=True, blank=True)
    name = models.CharField(max_length=150)
    market_type = models.CharField(
        max_length=20, choices=MarketType.choices, default=MarketType.MATCH_ODDS
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    winning_selection = models.CharField(max_length=150, null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'sport_markets'

    def __str__(self):
        return self.name


class SportBet(models.Model):
    """One stake on one market.

    Every money column is signed from the HOUSE's point of view, so the reports
    can ``Sum()`` straight out of the database without a CASE per row:
    ``profit_loss`` positive means the house won it.

    ``agent_id`` is denormalised off ``user_settings`` at placement time — it is
    what every report groups by, and moving a player to another agent tomorrow
    must not silently rewrite yesterday's history.
    """

    class Side(models.TextChoices):
        BACK = 'back', 'Back'
        LAY = 'lay', 'Lay'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        WON = 'won', 'Won'
        LOST = 'lost', 'Lost'
        VOID = 'void', 'Void'
        CANCELLED = 'cancelled', 'Cancelled'

    # Anything not in here is still running and contributes exposure, not P&L.
    SETTLED_STATUSES = (Status.WON, Status.LOST, Status.VOID)

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        'core.User', on_delete=models.CASCADE, db_column='user_id',
        related_name='sport_bets',
    )
    agent_id = models.BigIntegerField(null=True, blank=True)
    event = models.ForeignKey(
        SportEvent, on_delete=models.CASCADE, db_column='event_id',
        related_name='bets',
    )
    market = models.ForeignKey(
        SportMarket, on_delete=models.CASCADE, db_column='market_id',
        related_name='bets',
    )
    selection_name = models.CharField(max_length=150, null=True, blank=True)
    side = models.CharField(max_length=10, choices=Side.choices, default=Side.BACK)
    odds = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    run_line = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    stake = models.DecimalField(max_digits=18, decimal_places=2)
    liability = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    potential_win = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    exposure = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    profit_loss = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    commission = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    placed_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'sport_bets'
