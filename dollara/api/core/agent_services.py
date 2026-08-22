"""Business logic for the agent panel.

Layering matches the rest of this codebase: views are thin adapters that pull
query params, call one function here, and wrap the result in ``JsonResponse``.
Failures are raised as ``ValueError`` with a message meant for a human, which
the view turns into ``{'error': ...}``.

Three ideas run through the whole module and are worth reading before the code:

**Scope.** An agent may only ever see itself and its downline. That is not a
filter applied per query — it is :func:`downline_ids` / :func:`downline_player_ids`,
called once at the top of every read, and there is no code path that queries
``sport_bets`` or ``users`` without one of them. Forgetting it in a new report
would leak the whole book to a bottom-rung agent, so no report builds its own.

**Sign convention.** Every stored money column on ``sport_bets`` is signed from
the HOUSE's point of view: ``profit_loss`` positive means the house won. The
panel prints most numbers from the MEMBER's point of view, so exactly one
function flips the sign — :func:`_split_pl` — and every report goes through it.

**Casino vs sports.** Casino play lives in ``game_rounds`` (aggregator
callbacks); exchange play lives in ``sport_bets``. Aggregator games in a sports
category count as sports, so a Sportsbook round is never reported as casino
revenue. :func:`_casino_totals` and :func:`_sports_totals` own that split.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db import IntegrityError
from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from core.agent_models import (Agent, AgentAuditLog, AgentSettlement,
                               AgentTransfer, SportBet, SportEvent,
                               SportMarket)
from core.auth_jwt import sign_token
from core.models import (Game, GameRound, PlatformSetting, Transaction, User,
                         UserSetting, Wallet)
from core.services import _check_password, hash_password
from tenants.state import get_current_tenant_id, tenant_atomic

logger = logging.getLogger('agent')

ZERO = Decimal('0.00')
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

# Aggregator categories that belong to the sports side of every report, not the
# casino side. `sports` is the real sportsbook; `virtual_sports` is simulated
# but is still sold, priced and reported as a sports product.
SPORTS_CATEGORIES = (Game.Category.SPORTS, Game.Category.VIRTUAL_SPORTS)

USERNAME_RE = re.compile(r'^[A-Za-z0-9_.]{4,30}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

SETTINGS_KEY = 'agent_program'

# Used only when the platform_settings row is missing entirely (a database that
# predates migration 004). Every read merges the stored row over these.
DEFAULT_PROGRAM_SETTINGS = {
    'default_level': 'agent',
    'default_partnership': 25,
    'default_commission_rate': 2,
    'default_opening_credit': 0,
    'min_partnership': 0,
    'max_partnership': 100,
    'review_hours': 24,
    'currency': 'INR',
}

MONEY = DecimalField(max_digits=20, decimal_places=2)


def _money(expression=None):
    """``Sum`` that returns 0 instead of NULL for an empty set.

    Every tile on the dashboard would otherwise have to null-check, and the one
    that forgot would print "null" to an agent.
    """
    return Coalesce(Sum(expression), Value(ZERO), output_field=MONEY)


def client_ip(request) -> str | None:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def audit(agent_id, action, *, actor_id=None, actor_label=None,
          target_type=None, target_id=None, metadata=None, ip=None):
    """Record an action. Never raises — an audit failure must not undo the work
    that was already done."""
    try:
        AgentAuditLog.objects.create(
            agent_id=agent_id,
            actor_id=actor_id,
            actor_label=(actor_label or '')[:100] or None,
            action=action[:60],
            target_type=target_type,
            target_id=target_id,
            metadata=metadata,
            ip_address=ip,
        )
    except Exception:
        logger.exception('failed to write agent audit log')


# ---------------------------------------------------------------------------
# Scope: an agent sees itself and everything below it, and nothing else
# ---------------------------------------------------------------------------

def downline_ids(agent: Agent, *, include_self: bool = True) -> list[int]:
    """Every agent id at or below ``agent``.

    Reads the materialised ``tree_path`` rather than walking parents: one
    indexed prefix scan instead of one query per level, and it works on MySQL
    5.7 where a recursive CTE is not available at all.
    """
    path = agent.tree_path or f'/{agent.id}/'
    ids = list(
        Agent.objects.filter(tree_path__startswith=path)
        .values_list('id', flat=True)
    )
    # A row whose path was never stamped would drop out of its own subtree, so
    # the agent itself is added explicitly rather than assumed present.
    if include_self and agent.id not in ids:
        ids.append(agent.id)
    if not include_self:
        ids = [i for i in ids if i != agent.id]
    return ids


def downline_player_ids(agent: Agent) -> list[int]:
    """Every player user id under ``agent``'s subtree."""
    return list(
        UserSetting.objects.filter(agent_id__in=downline_ids(agent))
        .values_list('user_id', flat=True)
    )


def assert_in_downline(agent: Agent, target: Agent) -> None:
    """Guard a write against an agent outside the caller's subtree."""
    if target.id == agent.id:
        raise ValueError('You cannot perform this action on your own account')
    if target.id not in downline_ids(agent):
        raise ValueError('That account is not in your downline')


def assert_player_in_downline(agent: Agent, user_id: int) -> UserSetting:
    prefs = UserSetting.objects.filter(user_id=user_id).first()
    if not prefs or prefs.agent_id not in downline_ids(agent):
        raise ValueError('That player is not in your downline')
    return prefs


# ---------------------------------------------------------------------------
# Date range
# ---------------------------------------------------------------------------

def parse_range(from_value: str | None, to_value: str | None):
    """Turn the panel's ``MM/DD/YYYY`` or ISO dates into an inclusive datetime
    pair. Defaults to today, which is what the panel's own picker opens on."""
    today = timezone.localdate()

    def parse_one(value, fallback):
        if not value:
            return fallback
        text = str(value).strip()
        for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return fallback

    start = parse_one(from_value, today)
    end = parse_one(to_value, today)
    if end < start:
        start, end = end, start

    tz = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.combine(start, time.min), tz),
        timezone.make_aware(datetime.combine(end, time.max), tz),
    )


# ---------------------------------------------------------------------------
# The one place the house/member sign flip happens
# ---------------------------------------------------------------------------

def _split_pl(house_pl, commission, partnership) -> dict:
    """Split one house result into the member / agent / upline columns.

    Stored ``profit_loss`` is house-positive. The panel's MEMBER columns are
    member-positive, so the sign flips exactly once, here.

    ``partnership`` is the percentage of the result the viewing agent keeps;
    whatever is left flows to its upline. Commission is charged to the member
    and shared on the same split, which is why it is added back before the
    upline share is taken — it is revenue to the chain, not a cost of it.
    """
    house_pl = Decimal(house_pl or 0)
    commission = Decimal(commission or 0)
    share = Decimal(partnership or 0) / Decimal('100')

    member_win = -house_pl
    member_pl = member_win - commission

    agent_win = house_pl * share
    agent_comm = commission * share
    agent_pl = agent_win + agent_comm

    chain_total = house_pl + commission
    return {
        'memberWin': _q(member_win),
        'memberComm': _q(commission),
        'memberPl': _q(member_pl),
        'agentWin': _q(agent_win),
        'agentComm': _q(agent_comm),
        'agentPl': _q(agent_pl),
        'uplinePl': _q(chain_total - agent_pl),
    }


def _q(value) -> float:
    """Round to money and hand back a JSON-native float.

    Decimal is not JSON serialisable and the panel does its own locale
    formatting, so every number leaves this module as a float.
    """
    return float(Decimal(value or 0).quantize(Decimal('0.01')))


# ---------------------------------------------------------------------------
# Product totals
# ---------------------------------------------------------------------------

def _casino_totals(player_ids, start, end) -> dict:
    """Aggregator play that is not a sports product."""
    rounds = (
        GameRound.objects.filter(user_id__in=player_ids, created_at__range=(start, end))
        .exclude(game__category__in=SPORTS_CATEGORIES)
    )
    totals = rounds.aggregate(
        bets=_money('bet_amount'), wins=_money('win_amount'), count=Count('id')
    )
    return {
        'bets': _q(totals['bets']),
        'wins': _q(totals['wins']),
        # House view: stakes taken in, winnings paid out.
        'pl': _q(Decimal(totals['bets']) - Decimal(totals['wins'])),
        'count': totals['count'],
    }


def _sports_totals(player_ids, start, end) -> dict:
    """Exchange bets plus aggregator rounds on a sports-category game."""
    bets = SportBet.objects.filter(
        user_id__in=player_ids, placed_at__range=(start, end)
    )
    exchange = bets.aggregate(
        stake=_money('stake'),
        pl=_money('profit_loss'),
        commission=_money('commission'),
        count=Count('id'),
    )
    # Member wins are the losing side of the book, summed on their own rather
    # than clamped off the net. Netting first would report a player who won 500
    # and lost 400 as having won 100, which is not what "Sports Wins" means.
    exchange_wins = bets.filter(profit_loss__lt=0).aggregate(
        total=_money('profit_loss')
    )['total']
    rounds = (
        GameRound.objects.filter(user_id__in=player_ids, created_at__range=(start, end))
        .filter(game__category__in=SPORTS_CATEGORIES)
        .aggregate(bets=_money('bet_amount'), wins=_money('win_amount'), count=Count('id'))
    )

    stake = Decimal(exchange['stake']) + Decimal(rounds['bets'])
    # Exchange P&L is already house-signed; aggregator rounds are stake - win.
    house_pl = Decimal(exchange['pl']) + Decimal(rounds['bets']) - Decimal(rounds['wins'])
    # "Wins" on this panel means what the members took off the house.
    wins = Decimal(rounds['wins']) - Decimal(exchange_wins)
    return {
        'bets': _q(stake),
        'wins': _q(wins),
        'pl': _q(house_pl),
        'commission': _q(exchange['commission']),
        'count': exchange['count'] + rounds['count'],
    }


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def _login_payload(agent: Agent, ip=None) -> dict:
    """Mint the session. Role 'agent' means `sub` is an agents.id, never a
    users.id — the two never collide because no endpoint accepts both."""
    agent.last_login_at = timezone.now()
    agent.last_login_ip = ip
    agent.save(update_fields=['last_login_at', 'last_login_ip', 'updated_at'])
    return {
        'token': sign_token({'sub': agent.id, 'role': 'agent'},
                            tenant=get_current_tenant_id()),
        'agentId': agent.id,
        'code': agent.code,
        'username': agent.username,
        'name': agent.name,
        'level': agent.level,
        'role': 'agent',
        'mustChangePassword': agent.must_change_password,
    }


def login(username: str, password: str, *, ip=None) -> dict:
    agent = Agent.objects.filter(username=(username or '').strip()).first()
    if not agent or not agent.password_hash:
        raise ValueError('Invalid username or password')
    if not _check_password(password or '', agent.password_hash):
        raise ValueError('Invalid username or password')

    # Status is checked only after the password, so a wrong password and a
    # suspended account are indistinguishable to someone probing usernames.
    if agent.status == Agent.Status.PENDING:
        raise ValueError('Your application is still under review.')
    if agent.status == Agent.Status.INFO_REQUESTED:
        raise ValueError(
            'We need more information before approving your application.'
        )
    if agent.status == Agent.Status.REJECTED:
        raise ValueError('Your application was not approved.')
    if agent.status == Agent.Status.CLOSED or not agent.is_active:
        raise ValueError('This account has been closed.')
    if agent.status == Agent.Status.SUSPENDED:
        raise ValueError('This account has been suspended.')
    if agent.user_locked:
        raise ValueError('This account is locked. Contact your upline.')

    audit(agent.id, 'auth.login', actor_id=agent.id, actor_label=agent.name, ip=ip)
    return _login_payload(agent, ip=ip)


def change_password(agent: Agent, current_password: str, new_password: str) -> dict:
    if not agent.password_hash or not _check_password(
        current_password or '', agent.password_hash
    ):
        raise ValueError('Your current password is not correct')
    _validate_password(new_password)
    agent.password_hash = hash_password(new_password)
    agent.must_change_password = False
    agent.save(update_fields=['password_hash', 'must_change_password', 'updated_at'])
    audit(agent.id, 'auth.password_changed', actor_id=agent.id, actor_label=agent.name)
    return {'changed': True}


def _validate_password(password: str) -> None:
    if not password or len(password) < 6:
        raise ValueError('Password must be at least 6 characters')


def get_identity(agent: Agent) -> dict:
    """What the panel's header and its credit strip read on every page."""
    # tree_path-based, so applications (which have none) are already excluded.
    children = downline_ids(agent, include_self=False)
    player_count = UserSetting.objects.filter(
        agent_id__in=downline_ids(agent)
    ).count()
    # Downline exposure is what the agent is actually carrying: their own open
    # bets plus everything their subtree has not settled.
    downline_exposure = Agent.objects.filter(id__in=children).aggregate(
        total=_money('exposure')
    )['total']
    return {
        'id': agent.id,
        'code': agent.code,
        'username': agent.username,
        'name': agent.name,
        'level': agent.level,
        'levelLabel': agent.get_level_display(),
        'canCreate': agent.can_create_below,
        'currency': agent.currency,
        'timezone': agent.timezone,
        'creditReference': _q(agent.credit_reference),
        'balance': _q(agent.balance),
        'exposure': _q(agent.exposure),
        'availableCredit': _q(agent.available_credit),
        'netExposure': _q(Decimal(agent.exposure or 0) + Decimal(downline_exposure)),
        'partnership': _q(agent.partnership),
        'commissionRate': _q(agent.commission_rate),
        'settledPl': _q(agent.settled_pl),
        'unsettledPl': _q(agent.unsettled_pl),
        'status': agent.status,
        'betLocked': agent.bet_locked,
        'mustChangePassword': agent.must_change_password,
        'downlineAgents': len(children),
        'downlinePlayers': player_count,
        'lastLoginAt': agent.last_login_at,
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def get_dashboard(agent: Agent, from_value=None, to_value=None) -> dict:
    start, end = parse_range(from_value, to_value)
    agent_ids = downline_ids(agent)
    player_ids = downline_player_ids(agent)

    casino = _casino_totals(player_ids, start, end)
    sports = _sports_totals(player_ids, start, end)

    deposits = Transaction.objects.filter(
        user_id__in=player_ids,
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.COMPLETED,
        created_at__range=(start, end),
    ).aggregate(total=_money('amount'), count=Count('id'))
    withdrawals = Transaction.objects.filter(
        user_id__in=player_ids,
        type=Transaction.TxType.WITHDRAWAL,
        status=Transaction.Status.COMPLETED,
        created_at__range=(start, end),
    ).aggregate(total=_money('amount'), count=Count('id'))

    hour_ago = timezone.now() - timedelta(hours=1)
    active_ids = set(
        GameRound.objects.filter(
            user_id__in=player_ids, created_at__range=(start, end)
        ).values_list('user_id', flat=True)
    ) | set(
        SportBet.objects.filter(
            user_id__in=player_ids, placed_at__range=(start, end)
        ).values_list('user_id', flat=True)
    )
    last_hour_ids = set(
        GameRound.objects.filter(
            user_id__in=player_ids, created_at__gte=hour_ago
        ).values_list('user_id', flat=True)
    ) | set(
        SportBet.objects.filter(
            user_id__in=player_ids, placed_at__gte=hour_ago
        ).values_list('user_id', flat=True)
    )

    return {
        'range': {'from': start.date().isoformat(), 'to': end.date().isoformat()},
        'playerStats': _player_stats_rows(player_ids, start, end),
        'agents': {
            'newAgents': Agent.objects.filter(
                id__in=agent_ids, created_at__range=(start, end)
            ).exclude(id=agent.id).count(),
            'newPlayers': User.objects.filter(
                id__in=player_ids, created_at__range=(start, end)
            ).count(),
            'totalPlayers': len(player_ids),
        },
        'players': {
            'active': len(active_ids),
            'lastHourActive': len(last_hour_ids),
        },
        'pl': _q(Decimal(str(casino['pl'])) + Decimal(str(sports['pl']))),
        'totalBets': casino['count'] + sports['count'],
        'deposits': {
            'total': _q(deposits['total']),
            'count': deposits['count'],
        },
        'withdrawals': {
            'total': _q(withdrawals['total']),
            'count': withdrawals['count'],
        },
        'revenue': {'sports': sports['pl'], 'casino': casino['pl']},
        'topWinningPlayers': _top_players(player_ids, start, end, winners=True),
        'topLosingPlayers': _top_players(player_ids, start, end, winners=False),
        'topWinningMarkets': _top_markets(player_ids, start, end, winners=True),
        'topLosingMarkets': _top_markets(player_ids, start, end, winners=False),
        'depositCountTop10': _deposit_count_top(player_ids, start, end),
        'depositMaxTop10': _deposit_max_top(player_ids, start, end),
        'withdrawCountTop10': _withdraw_count_top(player_ids, start, end),
    }


def _player_stats_rows(player_ids, start, end, limit: int = 50) -> list[dict]:
    """The wide per-player row at the top of the dashboard.

    Restricted to players who actually did something in the period — a listing
    of every dormant account would bury the handful that matter.
    """
    casino = {
        row['user_id']: row
        for row in GameRound.objects
        .filter(user_id__in=player_ids, created_at__range=(start, end))
        .exclude(game__category__in=SPORTS_CATEGORIES)
        .values('user_id')
        .annotate(bets=_money('bet_amount'), wins=_money('win_amount'))
    }
    sports_rounds = {
        row['user_id']: row
        for row in GameRound.objects
        .filter(user_id__in=player_ids, created_at__range=(start, end))
        .filter(game__category__in=SPORTS_CATEGORIES)
        .values('user_id')
        .annotate(bets=_money('bet_amount'), wins=_money('win_amount'))
    }
    exchange = {
        row['user_id']: row
        for row in SportBet.objects
        .filter(user_id__in=player_ids, placed_at__range=(start, end))
        .values('user_id')
        .annotate(stake=_money('stake'), pl=_money('profit_loss'))
    }
    # Winning bets only, for the same reason as in _sports_totals: the Wins
    # column is a gross figure, not the net position dressed up as one.
    exchange_wins = {
        row['user_id']: row['won']
        for row in SportBet.objects
        .filter(user_id__in=player_ids, placed_at__range=(start, end),
                profit_loss__lt=0)
        .values('user_id')
        .annotate(won=_money('profit_loss'))
    }

    active_ids = set(casino) | set(sports_rounds) | set(exchange)
    if not active_ids:
        return []

    wallets = {
        w.user_id: w for w in Wallet.objects.filter(user_id__in=active_ids)
    }
    users = User.objects.filter(id__in=active_ids).order_by('username')[:limit]

    rows = []
    for user in users:
        wallet = wallets.get(user.id)
        c = casino.get(user.id, {})
        sr = sports_rounds.get(user.id, {})
        ex = exchange.get(user.id, {})

        casino_bets = Decimal(c.get('bets') or 0)
        casino_wins = Decimal(c.get('wins') or 0)
        sports_bets = Decimal(sr.get('bets') or 0) + Decimal(ex.get('stake') or 0)
        exchange_pl = Decimal(ex.get('pl') or 0)
        sports_wins = (
            Decimal(sr.get('wins') or 0) - Decimal(exchange_wins.get(user.id) or 0)
        )
        sports_pl = (
            Decimal(sr.get('bets') or 0) - Decimal(sr.get('wins') or 0) + exchange_pl
        )

        rows.append({
            'userId': user.id,
            'username': user.username or user.full_name or f'#{user.id}',
            'balance': _q(wallet.main_balance if wallet else 0),
            'casinoBonusBalance': _q(wallet.bonus_balance if wallet else 0),
            'sportsBonusBalance': _q(wallet.sports_bonus_balance if wallet else 0),
            'casinoBets': _q(casino_bets),
            'casinoWins': _q(casino_wins),
            'casinoPl': _q(casino_bets - casino_wins),
            'sportsBets': _q(sports_bets),
            'sportsWins': _q(sports_wins),
            'sportsPl': _q(sports_pl),
        })
    return rows


def _top_players(player_ids, start, end, *, winners: bool, limit: int = 5):
    """Top members by their OWN result, so "winning" means the member won."""
    rows = (
        SportBet.objects
        .filter(user_id__in=player_ids, placed_at__range=(start, end),
                status__in=SportBet.SETTLED_STATUSES)
        .values('user_id')
        .annotate(house_pl=_money('profit_loss'))
    )
    # A member win is a house loss, so the winners are the most negative rows.
    ordered = sorted(rows, key=lambda r: r['house_pl'], reverse=not winners)
    names = dict(
        User.objects.filter(id__in=[r['user_id'] for r in ordered[:limit]])
        .values_list('id', 'username')
    )
    out = []
    for row in ordered[:limit]:
        amount = -Decimal(row['house_pl'])
        if (winners and amount <= 0) or (not winners and amount >= 0):
            continue
        out.append({
            'userId': row['user_id'],
            'player': names.get(row['user_id']) or f"#{row['user_id']}",
            'amount': _q(abs(amount)),
        })
    return out


def _top_markets(player_ids, start, end, *, winners: bool, limit: int = 5):
    """Top markets by the HOUSE's result — "winning" is winning for the book."""
    rows = (
        SportBet.objects
        .filter(user_id__in=player_ids, placed_at__range=(start, end),
                status__in=SportBet.SETTLED_STATUSES)
        .values('market_id', 'market__name', 'event__sport')
        .annotate(house_pl=_money('profit_loss'))
    )
    ordered = sorted(rows, key=lambda r: r['house_pl'], reverse=winners)
    out = []
    for row in ordered[:limit]:
        amount = Decimal(row['house_pl'])
        if (winners and amount <= 0) or (not winners and amount >= 0):
            continue
        out.append({
            'marketId': row['market_id'],
            'sport': row['event__sport'],
            'market': row['market__name'],
            'amount': _q(abs(amount)),
        })
    return out


def _deposit_count_top(player_ids, start, end, limit: int = 10):
    rows = (
        Transaction.objects
        .filter(user_id__in=player_ids, type=Transaction.TxType.DEPOSIT,
                status=Transaction.Status.COMPLETED, created_at__range=(start, end))
        .values('user_id')
        .annotate(count=Count('id'), total=_money('amount'))
        .order_by('-count')[:limit]
    )
    return _attach_usernames(rows, [
        ('count', 'count'), ('total', 'totalDeposit'),
    ])


def _withdraw_count_top(player_ids, start, end, limit: int = 10):
    rows = (
        Transaction.objects
        .filter(user_id__in=player_ids, type=Transaction.TxType.WITHDRAWAL,
                status=Transaction.Status.COMPLETED, created_at__range=(start, end))
        .values('user_id')
        .annotate(count=Count('id'), total=_money('amount'))
        .order_by('-count')[:limit]
    )
    return _attach_usernames(rows, [
        ('count', 'count'), ('total', 'totalWithdraw'),
    ])


def _deposit_max_top(player_ids, start, end, limit: int = 10):
    rows = (
        Transaction.objects
        .filter(user_id__in=player_ids, type=Transaction.TxType.DEPOSIT,
                status=Transaction.Status.COMPLETED, created_at__range=(start, end))
        .select_related('user')
        .order_by('-amount')[:limit]
    )
    # Ranked server-side like the other two Top-10 blocks, so the panel renders
    # all three from one component instead of one of them numbering itself.
    return [
        {
            'rank': index,
            'userId': tx.user_id,
            'player': tx.user.username or f'#{tx.user_id}',
            'amount': _q(tx.amount),
            'time': tx.created_at,
            'method': tx.payment_method or '—',
        }
        for index, tx in enumerate(rows, start=1)
    ]


def _attach_usernames(rows, fields):
    rows = list(rows)
    names = dict(
        User.objects.filter(id__in=[r['user_id'] for r in rows])
        .values_list('id', 'username')
    )
    out = []
    for index, row in enumerate(rows, start=1):
        item = {
            'rank': index,
            'userId': row['user_id'],
            'player': names.get(row['user_id']) or f"#{row['user_id']}",
        }
        for source, target in fields:
            value = row[source]
            item[target] = value if source == 'count' else _q(value)
        out.append(item)
    return out


# ---------------------------------------------------------------------------
# Sport analysis
# ---------------------------------------------------------------------------

def get_sport_analysis(agent: Agent) -> dict:
    """Live book: every event with open bets under this agent, by sport.

    Deliberately not date-filtered. This screen answers "what am I carrying
    right now", and an open bet placed last week is still risk today.
    """
    player_ids = downline_player_ids(agent)
    open_bets = SportBet.objects.filter(
        user_id__in=player_ids, status=SportBet.Status.OPEN
    )

    event_rows = (
        open_bets.values('event_id', 'event__name', 'event__sport',
                         'event__start_time')
        .annotate(
            bets=Count('id'),
            exposure=_money('exposure'),
            amount=_money('stake'),
            max_profit=_money('liability'),
        )
        .order_by('event__sport', 'event__start_time')
    )

    market_rows = (
        open_bets.values('event_id', 'market_id', 'market__name',
                         'market__market_type')
        .annotate(
            bets=Count('id'),
            exposure=_money('exposure'),
            max_profit=_money('liability'),
        )
        .order_by('market__name')
    )

    markets_by_event = {}
    for row in market_rows:
        markets_by_event.setdefault(row['event_id'], []).append({
            'marketId': row['market_id'],
            'market': row['market__name'],
            'marketType': row['market__market_type'],
            'bets': row['bets'],
            # Exposure is what the book stands to lose, so it prints negative.
            'exposure': _q(-Decimal(row['exposure'])),
            'maxProfit': _q(row['max_profit']),
        })

    sports = {}
    for row in event_rows:
        sport = row['event__sport']
        sports.setdefault(sport, []).append({
            'eventId': row['event_id'],
            'event': row['event__name'],
            'startTime': row['event__start_time'],
            'totalBets': row['bets'],
            'exposure': _q(-Decimal(row['exposure'])),
            'totalAmount': _q(row['amount']),
            'maxProfit': _q(row['max_profit']),
            'markets': markets_by_event.get(row['event_id'], []),
        })

    return {
        'sports': [
            {'sport': sport, 'count': len(events), 'events': events}
            for sport, events in sorted(sports.items())
        ],
    }


def get_event_book(agent: Agent, event_id: int) -> dict:
    """Every open bet on one event, for the drill-down behind an event name."""
    player_ids = downline_player_ids(agent)
    event = SportEvent.objects.filter(id=event_id).first()
    if not event:
        raise ValueError('That event does not exist')

    bets = (
        SportBet.objects
        .filter(user_id__in=player_ids, event_id=event_id)
        .select_related('user', 'market')
        .order_by('-placed_at')[:500]
    )
    return {
        'event': {
            'id': event.id,
            'name': event.name,
            'sport': event.sport,
            'competition': event.competition,
            'startTime': event.start_time,
            'status': event.status,
        },
        'bets': [_serialize_bet(bet) for bet in bets],
    }


def _serialize_bet(bet: SportBet) -> dict:
    return {
        'id': bet.id,
        'player': bet.user.username or f'#{bet.user_id}',
        'userId': bet.user_id,
        'event': bet.event.name if bet.event_id else None,
        'market': bet.market.name if bet.market_id else None,
        'marketType': bet.market.market_type if bet.market_id else None,
        'selection': bet.selection_name,
        'side': bet.side,
        'odds': _q(bet.odds),
        'runLine': _q(bet.run_line) if bet.run_line is not None else None,
        'stake': _q(bet.stake),
        'liability': _q(bet.liability),
        'potentialWin': _q(bet.potential_win),
        'exposure': _q(bet.exposure),
        # Member view, matching every other number the panel shows a member.
        'profitLoss': _q(-Decimal(bet.profit_loss or 0)),
        'commission': _q(bet.commission),
        'status': bet.status,
        'placedAt': bet.placed_at,
        'settledAt': bet.settled_at,
    }


# ---------------------------------------------------------------------------
# Clients — the agent accounts directly below this one
# ---------------------------------------------------------------------------

def _generate_code() -> str:
    """A short, unambiguous account code. The alphabet drops I/O/0/1."""
    for _ in range(20):
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        if not Agent.objects.filter(code=code).exists():
            return code
    raise ValueError('Could not allocate an account code, please try again')


def list_clients(agent: Agent, *, search=None, status=None,
                 page: int = 0, per_page: int = 25) -> dict:
    """Direct children only.

    The panel's Clients screen is one level of the tree, not the whole subtree:
    an agent manages who it created, and drills down by opening one of them.

    Applications are excluded even though a pending one carries this agent as
    its `parent_id` — that link is the placement staff will default to when
    approving, not a statement that it is an account yet. The panel never shows
    them anywhere: review happens in the admin console.
    """
    qs = Agent.objects.filter(parent_id=agent.id).exclude(
        status__in=Agent.APPLICATION_STATUSES
    )
    if search:
        qs = qs.filter(
            Q(username__icontains=search) | Q(name__icontains=search)
            | Q(code__icontains=search)
        )
    if status:
        qs = qs.filter(status=status)

    total = qs.count()
    rows = qs.order_by('username')[page * per_page:(page + 1) * per_page]

    # One aggregate for the whole page rather than one per row.
    child_ids = [row.id for row in rows]
    player_counts = dict(
        UserSetting.objects.filter(agent_id__in=child_ids)
        .values('agent_id').annotate(n=Count('id'))
        .values_list('agent_id', 'n')
    )

    return {
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [
            {
                'id': row.id,
                'code': row.code,
                'username': row.username,
                'name': row.name,
                'level': row.level,
                'levelLabel': row.get_level_display(),
                'creditReference': _q(row.credit_reference),
                'balance': _q(row.balance),
                'exposure': _q(row.exposure),
                'availableCredit': _q(row.available_credit),
                'partnership': _q(row.partnership),
                'settledPl': _q(row.settled_pl),
                'unsettledPl': _q(row.unsettled_pl),
                'players': player_counts.get(row.id, 0),
                'status': row.status,
                'betLocked': row.bet_locked,
                'userLocked': row.user_locked,
                'createdAt': row.created_at,
            }
            for row in rows
        ],
    }


def create_client(agent: Agent, *, username, password, name, level,
                  partnership=0, commission_rate=0, credit=0, ip=None) -> dict:
    """Open an account one or more rungs below the caller.

    The level check is the security boundary here: without it an agent could
    create a peer — or an upline — and read the whole book through it.
    """
    username = (username or '').strip()
    if not USERNAME_RE.match(username):
        raise ValueError(
            'Username must be 4-30 characters, letters, numbers, dot or underscore'
        )
    _validate_password(password)
    if level not in agent.can_create_below:
        raise ValueError('You cannot create an account at that level')

    partnership = Decimal(str(partnership or 0))
    if partnership < 0 or partnership > 100:
        raise ValueError('Partnership must be between 0 and 100')
    credit = Decimal(str(credit or 0))
    if credit < 0:
        raise ValueError('Opening credit cannot be negative')

    with tenant_atomic():
        # Locked, and the credit check re-run inside the lock: two accounts
        # opened at the same instant would otherwise both pass a check made
        # against the same stale balance and overdraw it.
        me = Agent.objects.select_for_update().get(id=agent.id)
        if credit > me.available_credit:
            raise ValueError('Opening credit exceeds your available credit')

        try:
            child = Agent.objects.create(
                code=_generate_code(),
                username=username,
                password_hash=hash_password(password),
                name=(name or username)[:100],
                parent_id=agent.id,
                level=level,
                depth=agent.depth + 1,
                partnership=partnership,
                commission_rate=Decimal(str(commission_rate or 0)),
                credit_reference=credit,
                balance=credit,
                created_by=agent.id,
                # An account opened with a password someone else chose has to
                # change it before it means anything as an audit identity.
                must_change_password=True,
            )
        except IntegrityError as exc:
            raise ValueError('That username is already taken') from exc

        # The path can only be written once the id exists, which is why this is
        # a second write rather than part of the create above.
        child.tree_path = f'{agent.tree_path or f"/{agent.id}/"}{child.id}/'
        child.save(update_fields=['tree_path', 'updated_at'])

        if credit > 0:
            me.balance = Decimal(me.balance or 0) - credit
            me.save(update_fields=['balance', 'updated_at'])
            AgentTransfer.objects.create(
                agent_id=me.id,
                counterparty_type=AgentTransfer.CounterpartyType.AGENT,
                counterparty_id=child.id,
                direction=AgentTransfer.Direction.DOWN,
                amount=credit,
                agent_balance_after=me.balance,
                counterparty_balance_after=child.balance,
                remark='Opening credit',
                performed_by=agent.id,
            )

    audit(agent.id, 'client.created', actor_id=agent.id, actor_label=agent.name,
          target_type=AgentAuditLog.TargetType.AGENT, target_id=child.id,
          metadata={'level': level, 'credit': str(credit)}, ip=ip)
    return {'id': child.id, 'code': child.code, 'username': child.username}


def update_client(agent: Agent, client_id: int, changes: dict, *, ip=None) -> dict:
    """Apply one or more of the panel's Actions to a downline account."""
    child = Agent.objects.filter(id=client_id).first()
    if not child:
        raise ValueError('That account does not exist')
    assert_in_downline(agent, child)

    updated = []
    if 'betLocked' in changes:
        child.bet_locked = bool(changes['betLocked'])
        updated.append('bet_locked')
    if 'userLocked' in changes:
        child.user_locked = bool(changes['userLocked'])
        updated.append('user_locked')
    if 'status' in changes:
        if changes['status'] not in Agent.Status.values:
            raise ValueError('Unknown status')
        child.status = changes['status']
        updated.append('status')
    if 'partnership' in changes:
        value = Decimal(str(changes['partnership'] or 0))
        if value < 0 or value > 100:
            raise ValueError('Partnership must be between 0 and 100')
        child.partnership = value
        updated.append('partnership')
    if 'commissionRate' in changes:
        child.commission_rate = Decimal(str(changes['commissionRate'] or 0))
        updated.append('commission_rate')
    if changes.get('password'):
        _validate_password(changes['password'])
        child.password_hash = hash_password(changes['password'])
        child.must_change_password = True
        updated.extend(['password_hash', 'must_change_password'])

    if not updated:
        raise ValueError('Nothing to update')

    child.save(update_fields=[*set(updated), 'updated_at'])
    audit(agent.id, 'client.updated', actor_id=agent.id, actor_label=agent.name,
          target_type=AgentAuditLog.TargetType.AGENT, target_id=child.id,
          metadata={'fields': sorted(set(updated))}, ip=ip)
    return {'updated': sorted(set(updated))}


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

def list_players(agent: Agent, *, player_id=None, username=None,
                 page: int = 0, per_page: int = 25) -> dict:
    scope_ids = downline_ids(agent)
    prefs = UserSetting.objects.filter(agent_id__in=scope_ids)
    if player_id:
        prefs = prefs.filter(user_id=player_id)
    user_ids = list(prefs.values_list('user_id', flat=True))

    qs = User.objects.filter(id__in=user_ids, role=User.Role.USER)
    if username:
        qs = qs.filter(Q(username__icontains=username)
                       | Q(full_name__icontains=username))

    total = qs.count()
    rows = list(qs.order_by('username')[page * per_page:(page + 1) * per_page])
    row_ids = [row.id for row in rows]

    wallets = {w.user_id: w for w in Wallet.objects.filter(user_id__in=row_ids)}
    # Current P&L is the member's unsettled position, which is what the panel
    # shows next to their balance — settled money is already in the balance.
    open_pl = {
        row['user_id']: row['pl']
        for row in SportBet.objects
        .filter(user_id__in=row_ids, status__in=SportBet.SETTLED_STATUSES)
        .values('user_id').annotate(pl=_money('profit_loss'))
    }
    exposures = {
        row['user_id']: row['exposure']
        for row in SportBet.objects
        .filter(user_id__in=row_ids, status=SportBet.Status.OPEN)
        .values('user_id').annotate(exposure=_money('exposure'))
    }
    demo_ids = set(
        UserSetting.objects.filter(user_id__in=row_ids, is_demo=True)
        .values_list('user_id', flat=True)
    )

    return {
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [
            {
                'id': row.id,
                'username': row.username or row.full_name or f'#{row.id}',
                'fullName': row.full_name,
                'availableBalance': _q(
                    (wallets[row.id].main_balance - wallets[row.id].exposure_balance)
                    if row.id in wallets else 0
                ),
                'balance': _q(wallets[row.id].main_balance if row.id in wallets else 0),
                'currentPl': _q(-Decimal(open_pl.get(row.id) or 0)),
                'exposure': _q(exposures.get(row.id) or 0),
                'type': 'Demo' if row.id in demo_ids else 'Live',
                'status': row.account_status,
                'createdAt': row.created_at,
            }
            for row in rows
        ],
    }


def create_player(agent: Agent, *, username, password, full_name=None,
                  phone=None, credit=0, ip=None) -> dict:
    """Open a player account attributed to this agent.

    Deliberately not routed through ``services.register_user``: that flow is the
    public sign-up — it allocates a sequential username, awards the joining
    bonus and runs affiliate attribution, none of which apply to an account an
    agent opens by hand for a named person.
    """
    username = (username or '').strip()
    if not USERNAME_RE.match(username):
        raise ValueError(
            'Username must be 4-30 characters, letters, numbers, dot or underscore'
        )
    _validate_password(password)
    if User.objects.filter(username=username).exists():
        raise ValueError('That username is already taken')

    credit = Decimal(str(credit or 0))
    if credit < 0:
        raise ValueError('Opening credit cannot be negative')

    with tenant_atomic():
        # Same lock-then-check as create_client, for the same reason.
        me = Agent.objects.select_for_update().get(id=agent.id)
        if credit > me.available_credit:
            raise ValueError('Opening credit exceeds your available credit')

        try:
            user = User.objects.create(
                username=username,
                full_name=(full_name or username)[:100],
                phone=(phone or None),
                role=User.Role.USER,
                password_hash=hash_password(password),
            )
        except IntegrityError as exc:
            raise ValueError('That username or phone is already registered') from exc

        Wallet.objects.create(user=user, main_balance=credit)
        UserSetting.objects.create(user=user, agent_id=agent.id, phone_verified=False)

        if credit > 0:
            me.balance = Decimal(me.balance or 0) - credit
            me.save(update_fields=['balance', 'updated_at'])
            AgentTransfer.objects.create(
                agent_id=me.id,
                counterparty_type=AgentTransfer.CounterpartyType.PLAYER,
                counterparty_id=user.id,
                direction=AgentTransfer.Direction.DOWN,
                amount=credit,
                agent_balance_after=me.balance,
                counterparty_balance_after=credit,
                remark='Opening credit',
                performed_by=agent.id,
            )
            # Opening credit is a deposit like any other. Funding the wallet
            # above without this row is what left a new player showing a
            # balance the dashboard could not account for.
            _record_player_cash(
                user.id, credit, AgentTransfer.Direction.DOWN,
                remark='Opening credit',
            )

    audit(agent.id, 'player.created', actor_id=agent.id, actor_label=agent.name,
          target_type=AgentAuditLog.TargetType.PLAYER, target_id=user.id,
          metadata={'credit': str(credit)}, ip=ip)
    return {'id': user.id, 'username': user.username}


def update_player(agent: Agent, user_id: int, changes: dict, *, ip=None) -> dict:
    assert_player_in_downline(agent, user_id)
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise ValueError('That player does not exist')

    updated = []
    if 'status' in changes:
        if changes['status'] not in User.AccountStatus.values:
            raise ValueError('Unknown status')
        user.account_status = changes['status']
        updated.append('account_status')
    if changes.get('password'):
        _validate_password(changes['password'])
        user.password_hash = hash_password(changes['password'])
        updated.append('password_hash')
    if 'fullName' in changes:
        user.full_name = (changes['fullName'] or '')[:100] or None
        updated.append('full_name')

    if not updated:
        raise ValueError('Nothing to update')

    user.save(update_fields=[*updated, 'updated_at'])
    audit(agent.id, 'player.updated', actor_id=agent.id, actor_label=agent.name,
          target_type=AgentAuditLog.TargetType.PLAYER, target_id=user.id,
          metadata={'fields': updated}, ip=ip)
    return {'updated': updated}


# ---------------------------------------------------------------------------
# Credit movement
# ---------------------------------------------------------------------------

def _record_player_cash(user_id: int, amount: Decimal, direction: str, *,
                        remark: str) -> None:
    """Mirror an agent-to-player credit move into the player's cash ledger.

    ``wallets`` holds the balance; ``transactions`` holds the history — and
    every deposit and withdrawal figure in the product counts rows in the
    latter, never wallet deltas. The dashboard's Sum Of Deposits tile, its
    Deposit/Withdraw Top 10 tables, the Transactions report and the net-cash
    column of Real Revenue all read from there.

    So every path that moves real money into or out of a player wallet has to
    write here too. One that does not produces a balance with no deposit behind
    it: the Players screen shows the money (it reads the wallet) while the
    dashboard shows nothing (it counts transactions), and Real Revenue then
    reads the eventual withdrawal as pure loss.

    The caller owns the surrounding :func:`tenant_atomic` — this row has to
    land with the wallet write or not at all.
    """
    Transaction.objects.create(
        user_id=user_id,
        type=(Transaction.TxType.DEPOSIT if direction == 'down'
              else Transaction.TxType.WITHDRAWAL),
        amount=amount,
        status=Transaction.Status.COMPLETED,
        payment_method='agent_transfer',
        notes=remark,
    )


def transfer_credit(agent: Agent, *, counterparty_type, counterparty_id,
                    direction, amount, remark=None, ip=None) -> dict:
    """Move credit between the agent and one account directly below it.

    Both balances move inside one transaction and both post-balances are
    written onto the ledger row. That is what lets the Transfer Statement be
    audited without replaying the whole history to work out what a balance was
    at the time.
    """
    amount = Decimal(str(amount or 0))
    if amount <= 0:
        raise ValueError('Amount must be greater than zero')
    if direction not in AgentTransfer.Direction.values:
        raise ValueError('Unknown transfer direction')
    if counterparty_type not in AgentTransfer.CounterpartyType.values:
        raise ValueError('Unknown counterparty type')

    with tenant_atomic():
        # Locked in id order is not enough here — the two rows live in different
        # tables — so the agent is always locked first and the counterparty
        # second, giving every concurrent transfer the same acquisition order.
        me = Agent.objects.select_for_update().get(id=agent.id)

        if counterparty_type == AgentTransfer.CounterpartyType.AGENT:
            child = Agent.objects.select_for_update().filter(id=counterparty_id).first()
            if not child or child.parent_id != me.id:
                raise ValueError('That account is not directly below you')
            # A pending application carries a parent_id for its eventual
            # placement, but it is not an account and must not hold credit.
            if child.is_application:
                raise ValueError('That application has not been approved yet')
            source, target = (me, child) if direction == 'down' else (child, me)
            # Whoever the credit leaves must have it free of open bets, which
            # is the same test in both directions.
            if amount > source.available_credit:
                raise ValueError('Amount exceeds available credit')
            source.balance = Decimal(source.balance or 0) - amount
            target.balance = Decimal(target.balance or 0) + amount

            # credit_reference means "what my upline has extended to me", so it
            # always moves on the CHILD — up or down. Moving it on `target`
            # would credit the parent's own reference when pulling money back.
            delta = amount if direction == 'down' else -amount
            child.credit_reference = max(
                Decimal(child.credit_reference or 0) + delta, ZERO
            )

            me.save(update_fields=['balance', 'updated_at'])
            child.save(update_fields=['balance', 'credit_reference', 'updated_at'])
            counterparty_balance = child.balance
        else:
            prefs = assert_player_in_downline(agent, counterparty_id)
            if prefs.agent_id != me.id:
                raise ValueError('That player is not directly below you')
            wallet = Wallet.objects.select_for_update().filter(
                user_id=counterparty_id
            ).first()
            if not wallet:
                raise ValueError('That player has no wallet')

            if direction == 'down':
                if amount > me.available_credit:
                    raise ValueError('Amount exceeds available credit')
                me.balance = Decimal(me.balance or 0) - amount
                wallet.main_balance = Decimal(wallet.main_balance or 0) + amount
            else:
                withdrawable = (
                    Decimal(wallet.main_balance or 0)
                    - Decimal(wallet.exposure_balance or 0)
                    - Decimal(wallet.locked_balance or 0)
                )
                if amount > withdrawable:
                    raise ValueError(
                        'The player does not have that much unencumbered balance'
                    )
                me.balance = Decimal(me.balance or 0) + amount
                wallet.main_balance = Decimal(wallet.main_balance or 0) - amount

            me.save(update_fields=['balance', 'updated_at'])
            wallet.save(update_fields=['main_balance', 'updated_at'])
            counterparty_balance = wallet.main_balance

            _record_player_cash(
                counterparty_id, amount, direction,
                remark=(remark or f'Agent {me.username} credit {direction}'),
            )

        transfer = AgentTransfer.objects.create(
            agent_id=me.id,
            counterparty_type=counterparty_type,
            counterparty_id=counterparty_id,
            direction=direction,
            amount=amount,
            agent_balance_after=me.balance,
            counterparty_balance_after=counterparty_balance,
            remark=(remark or None),
            performed_by=agent.id,
        )

    audit(agent.id, f'credit.{direction}', actor_id=agent.id, actor_label=agent.name,
          target_type=counterparty_type, target_id=counterparty_id,
          metadata={'amount': str(amount)}, ip=ip)
    return {
        'id': transfer.id,
        'agentBalance': _q(me.balance),
        'counterpartyBalance': _q(counterparty_balance),
    }


def settle(agent: Agent, *, counterparty_type, counterparty_id, amount,
           note=None, period_from=None, period_to=None, ip=None) -> dict:
    """Record a settlement and clear the P&L it covers.

    ``amount`` is signed from the agent's side: positive means the counterparty
    owed the agent.
    """
    amount = Decimal(str(amount or 0))
    if amount == 0:
        raise ValueError('Settlement amount cannot be zero')
    if counterparty_type not in AgentSettlement.CounterpartyType.values:
        raise ValueError('Unknown counterparty type')

    start, end = parse_range(period_from, period_to)

    with tenant_atomic():
        me = Agent.objects.select_for_update().get(id=agent.id)
        if counterparty_type == AgentSettlement.CounterpartyType.AGENT:
            child = Agent.objects.select_for_update().filter(id=counterparty_id).first()
            if not child or child.parent_id != me.id:
                raise ValueError('That account is not directly below you')
            if child.is_application:
                raise ValueError('That application has not been approved yet')
            pl_before = Decimal(child.unsettled_pl or 0)
            child.unsettled_pl = pl_before - amount
            child.settled_pl = Decimal(child.settled_pl or 0) + amount
            child.save(update_fields=['unsettled_pl', 'settled_pl', 'updated_at'])
            pl_after = child.unsettled_pl
        else:
            assert_player_in_downline(agent, counterparty_id)
            # A player has no P&L column of their own — their position is the
            # bets themselves, so only the agent's side moves.
            pl_before = ZERO
            pl_after = ZERO

        me.settled_pl = Decimal(me.settled_pl or 0) + amount
        me.save(update_fields=['settled_pl', 'updated_at'])

        record = AgentSettlement.objects.create(
            agent_id=me.id,
            counterparty_type=counterparty_type,
            counterparty_id=counterparty_id,
            amount=amount,
            pl_before=pl_before,
            pl_after=pl_after,
            period_start=start.date(),
            period_end=end.date(),
            note=(note or None),
            settled_by=agent.id,
        )

    audit(agent.id, 'settlement.recorded', actor_id=agent.id, actor_label=agent.name,
          target_type=AgentAuditLog.TargetType.SETTLEMENT, target_id=record.id,
          metadata={'amount': str(amount)}, ip=ip)
    return {'id': record.id, 'amount': _q(amount)}


# ---------------------------------------------------------------------------
# Reports
#
# Every report takes the same filter dict and returns the same envelope:
#
#     {'summary': {...}, 'rows': [...], 'grandTotal': {...}}
#
# so the panel can render eight screens from one table component, and a CSV
# export can be produced from any of them without a per-report writer.
# ---------------------------------------------------------------------------

def _report_scope(agent: Agent, filters: dict):
    """The bets any report may read: this agent's subtree, in the period."""
    start, end = parse_range(filters.get('from'), filters.get('to'))
    player_ids = downline_player_ids(agent)
    qs = SportBet.objects.filter(
        user_id__in=player_ids, placed_at__range=(start, end)
    )

    if filters.get('sport'):
        qs = qs.filter(event__sport__iexact=filters['sport'])
    if filters.get('marketType'):
        qs = qs.filter(market__market_type=filters['marketType'])
    if filters.get('event'):
        qs = qs.filter(event__name__icontains=filters['event'])
    if filters.get('agentName'):
        # Names are resolved to ids first so the bet query stays a single
        # indexed IN() rather than a join back onto agents.
        matched = Agent.objects.filter(
            Q(username__icontains=filters['agentName'])
            | Q(name__icontains=filters['agentName']),
            id__in=downline_ids(agent),
        ).values_list('id', flat=True)
        qs = qs.filter(agent_id__in=list(matched))
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])

    return qs, start, end


def _credit_summary(agent: Agent, start, end) -> dict:
    """The strip above every report: what moved, and what is left."""
    moved = AgentTransfer.objects.filter(
        agent_id=agent.id, created_at__range=(start, end)
    ).values('direction').annotate(total=_money('amount'))
    by_direction = {row['direction']: row['total'] for row in moved}

    downline_exposure = Agent.objects.filter(
        id__in=downline_ids(agent, include_self=False)
    ).aggregate(total=_money('exposure'))['total']

    return {
        'balanceDown': _q(by_direction.get('down')),
        'balanceUp': _q(by_direction.get('up')),
        'netExposure': _q(
            Decimal(agent.exposure or 0) + Decimal(downline_exposure)
        ),
        'availableCredit': _q(agent.available_credit),
    }


# Columns that count things rather than measure money. Summed as integers so a
# grand total of one bet exports as "1", not "1.0".
COUNT_COLUMNS = frozenset({'totalBets', 'players'})


def _grand_total(rows: list[dict], keys: list[str]) -> dict:
    total = {}
    for key in keys:
        running = sum(
            (Decimal(str(row.get(key) or 0)) for row in rows), Decimal('0')
        )
        total[key] = int(running) if key in COUNT_COLUMNS else _q(running)
    return total


PL_COLUMNS = ['totalBets', 'turnover', 'memberWin', 'memberComm', 'memberPl',
              'agentWin', 'agentComm', 'agentPl', 'uplinePl']


def pl_by_market(agent: Agent, filters: dict) -> dict:
    """P&L grouped by event + market — the panel's default report."""
    qs, start, end = _report_scope(agent, filters)
    rows = (
        qs.filter(status__in=SportBet.SETTLED_STATUSES)
        .values('event_id', 'event__name', 'event__sport',
                'market_id', 'market__name', 'market__market_type')
        .annotate(
            bets=Count('id'),
            turnover=_money('stake'),
            house_pl=_money('profit_loss'),
            commission=_money('commission'),
        )
        .order_by('event__start_time', 'market__name')
    )

    out = []
    for row in rows:
        split = _split_pl(row['house_pl'], row['commission'], agent.partnership)
        out.append({
            'eventId': row['event_id'],
            'event': row['event__name'],
            'sport': row['event__sport'],
            'marketId': row['market_id'],
            'market': row['market__name'],
            'marketType': row['market__market_type'],
            'totalBets': row['bets'],
            'turnover': _q(row['turnover']),
            **split,
        })

    return {
        'summary': _credit_summary(agent, start, end),
        'rows': out,
        'grandTotal': _grand_total(out, PL_COLUMNS),
    }


def pl_by_agent(agent: Agent, filters: dict) -> dict:
    """The same numbers, grouped by the agent the bet was attributed to."""
    qs, start, end = _report_scope(agent, filters)
    rows = (
        qs.filter(status__in=SportBet.SETTLED_STATUSES)
        .values('agent_id')
        .annotate(
            bets=Count('id'),
            turnover=_money('stake'),
            house_pl=_money('profit_loss'),
            commission=_money('commission'),
        )
        .order_by('-turnover')
    )
    rows = list(rows)
    names = {
        a.id: a for a in Agent.objects.filter(
            id__in=[r['agent_id'] for r in rows if r['agent_id']]
        )
    }

    out = []
    for row in rows:
        row_agent = names.get(row['agent_id'])
        # Each row is split on the ROW agent's own partnership, not the
        # viewer's: that is what makes this report a statement of what each
        # downline account is owed rather than a re-slice of one number.
        share = row_agent.partnership if row_agent else agent.partnership
        split = _split_pl(row['house_pl'], row['commission'], share)
        out.append({
            'agentId': row['agent_id'],
            'agent': row_agent.username if row_agent else 'Unattributed',
            'agentName': row_agent.name if row_agent else '—',
            'level': row_agent.level if row_agent else None,
            'partnership': _q(share),
            'totalBets': row['bets'],
            'turnover': _q(row['turnover']),
            **split,
        })

    return {
        'summary': _credit_summary(agent, start, end),
        'rows': out,
        'grandTotal': _grand_total(out, PL_COLUMNS),
    }


def event_pl(agent: Agent, filters: dict) -> dict:
    """P&L rolled up to the event, one row per fixture."""
    qs, start, end = _report_scope(agent, filters)
    rows = (
        qs.filter(status__in=SportBet.SETTLED_STATUSES)
        .values('event_id', 'event__name', 'event__sport', 'event__start_time')
        .annotate(
            bets=Count('id'),
            players=Count('user_id', distinct=True),
            turnover=_money('stake'),
            house_pl=_money('profit_loss'),
            commission=_money('commission'),
        )
        .order_by('-event__start_time')
    )

    out = []
    for row in rows:
        split = _split_pl(row['house_pl'], row['commission'], agent.partnership)
        out.append({
            'eventId': row['event_id'],
            'event': row['event__name'],
            'sport': row['event__sport'],
            'startTime': row['event__start_time'],
            'players': row['players'],
            'totalBets': row['bets'],
            'turnover': _q(row['turnover']),
            **split,
        })

    return {
        'summary': _credit_summary(agent, start, end),
        'rows': out,
        'grandTotal': _grand_total(out, PL_COLUMNS),
    }


def bet_list(agent: Agent, filters: dict, *, page: int = 0,
             per_page: int = 50) -> dict:
    """Every individual stake, newest first."""
    qs, start, end = _report_scope(agent, filters)
    if filters.get('player'):
        qs = qs.filter(user__username__icontains=filters['player'])
    if filters.get('side'):
        qs = qs.filter(side=filters['side'])

    total = qs.count()
    rows = (
        qs.select_related('user', 'event', 'market')
        .order_by('-placed_at')[page * per_page:(page + 1) * per_page]
    )
    totals = qs.aggregate(
        turnover=_money('stake'),
        house_pl=_money('profit_loss'),
        exposure=_money('exposure'),
    )

    return {
        'summary': _credit_summary(agent, start, end),
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [_serialize_bet(bet) for bet in rows],
        'grandTotal': {
            'totalBets': total,
            'turnover': _q(totals['turnover']),
            'memberPl': _q(-Decimal(totals['house_pl'])),
            'exposure': _q(totals['exposure']),
        },
    }


def transfer_statement(agent: Agent, filters: dict, *, page: int = 0,
                       per_page: int = 50) -> dict:
    """Credit in and out of this agent's own account."""
    start, end = parse_range(filters.get('from'), filters.get('to'))
    qs = AgentTransfer.objects.filter(
        agent_id=agent.id, created_at__range=(start, end)
    )
    if filters.get('direction'):
        qs = qs.filter(direction=filters['direction'])

    total = qs.count()
    rows = list(qs.order_by('-created_at')[page * per_page:(page + 1) * per_page])

    labels = _counterparty_labels(rows)
    by_direction = {
        row['direction']: row['total']
        for row in qs.values('direction').annotate(total=_money('amount'))
    }

    return {
        'summary': _credit_summary(agent, start, end),
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [
            {
                'id': row.id,
                'date': row.created_at,
                'counterparty': labels.get(
                    (row.counterparty_type, row.counterparty_id),
                    f'#{row.counterparty_id}',
                ),
                'counterpartyType': row.counterparty_type,
                'direction': row.direction,
                # Signed as it hits the agent's own balance: down is money out.
                'amount': _q(
                    -Decimal(row.amount) if row.direction == 'down'
                    else Decimal(row.amount)
                ),
                'balanceAfter': _q(row.agent_balance_after),
                'remark': row.remark or '—',
            }
            for row in rows
        ],
        'grandTotal': {
            'balanceDown': _q(by_direction.get('down')),
            'balanceUp': _q(by_direction.get('up')),
            'net': _q(
                Decimal(by_direction.get('up') or 0)
                - Decimal(by_direction.get('down') or 0)
            ),
        },
    }


def settlement_report(agent: Agent, filters: dict, *, page: int = 0,
                      per_page: int = 50) -> dict:
    start, end = parse_range(filters.get('from'), filters.get('to'))
    qs = AgentSettlement.objects.filter(
        agent_id=agent.id, created_at__range=(start, end)
    )
    total = qs.count()
    rows = list(qs.order_by('-created_at')[page * per_page:(page + 1) * per_page])
    labels = _counterparty_labels(rows)
    totals = qs.aggregate(amount=_money('amount'))

    return {
        'summary': _credit_summary(agent, start, end),
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [
            {
                'id': row.id,
                'date': row.created_at,
                'counterparty': labels.get(
                    (row.counterparty_type, row.counterparty_id),
                    f'#{row.counterparty_id}',
                ),
                'counterpartyType': row.counterparty_type,
                'amount': _q(row.amount),
                'plBefore': _q(row.pl_before),
                'plAfter': _q(row.pl_after),
                'period': (
                    f'{row.period_start} → {row.period_end}'
                    if row.period_start else '—'
                ),
                'note': row.note or '—',
            }
            for row in rows
        ],
        'grandTotal': {'amount': _q(totals['amount'])},
    }


def _counterparty_labels(rows) -> dict:
    """Resolve (type, id) pairs to display names in two queries, not 2N."""
    agent_ids = [r.counterparty_id for r in rows if r.counterparty_type == 'agent']
    player_ids = [r.counterparty_id for r in rows if r.counterparty_type == 'player']
    labels = {}
    for agent_id, username, name in Agent.objects.filter(
        id__in=agent_ids
    ).values_list('id', 'username', 'name'):
        labels[('agent', agent_id)] = username or name or f'#{agent_id}'
    for user_id, username in User.objects.filter(
        id__in=player_ids
    ).values_list('id', 'username'):
        labels[('player', user_id)] = username or f'#{user_id}'
    return labels


def transactions_report(agent: Agent, filters: dict, *, page: int = 0,
                        per_page: int = 50) -> dict:
    """Deposits and withdrawals across the whole downline."""
    start, end = parse_range(filters.get('from'), filters.get('to'))
    player_ids = downline_player_ids(agent)
    qs = Transaction.objects.filter(
        user_id__in=player_ids, created_at__range=(start, end)
    )
    if filters.get('type'):
        qs = qs.filter(type=filters['type'])
    if filters.get('status'):
        qs = qs.filter(status=filters['status'])
    if filters.get('player'):
        qs = qs.filter(user__username__icontains=filters['player'])

    total = qs.count()
    rows = (
        qs.select_related('user')
        .order_by('-created_at')[page * per_page:(page + 1) * per_page]
    )
    completed = qs.filter(status=Transaction.Status.COMPLETED)
    deposits = completed.filter(type=Transaction.TxType.DEPOSIT).aggregate(
        total=_money('amount'), count=Count('id')
    )
    withdrawals = completed.filter(type=Transaction.TxType.WITHDRAWAL).aggregate(
        total=_money('amount'), count=Count('id')
    )

    return {
        'summary': _credit_summary(agent, start, end),
        'total': total,
        'page': page,
        'perPage': per_page,
        'rows': [
            {
                'id': tx.id,
                'date': tx.created_at,
                'player': tx.user.username or f'#{tx.user_id}',
                'type': tx.type,
                'amount': _q(tx.amount),
                'status': tx.status,
                'method': tx.payment_method or '—',
                'reference': tx.reference_number or '—',
            }
            for tx in rows
        ],
        'grandTotal': {
            'deposits': _q(deposits['total']),
            'depositCount': deposits['count'],
            'withdrawals': _q(withdrawals['total']),
            'withdrawalCount': withdrawals['count'],
            'net': _q(
                Decimal(deposits['total']) - Decimal(withdrawals['total'])
            ),
        },
    }


def real_revenue(agent: Agent, filters: dict) -> dict:
    """Cash in, cash out, and what the book actually kept.

    Distinct from every P&L report above: those measure the *book*, this
    measures the *cash*. A period can show a winning book and negative real
    revenue whenever players withdrew more than they deposited, and an agent
    settling up needs to see both numbers rather than infer one from the other.
    """
    start, end = parse_range(filters.get('from'), filters.get('to'))
    scope_ids = downline_ids(agent)

    agents = {a.id: a for a in Agent.objects.filter(id__in=scope_ids)}
    players_by_agent = {}
    for user_id, agent_id in UserSetting.objects.filter(
        agent_id__in=scope_ids
    ).values_list('user_id', 'agent_id'):
        players_by_agent.setdefault(agent_id, []).append(user_id)

    all_player_ids = [uid for ids in players_by_agent.values() for uid in ids]
    if not all_player_ids:
        return {
            'summary': _credit_summary(agent, start, end),
            'rows': [],
            'grandTotal': _grand_total([], REVENUE_COLUMNS),
        }

    def by_user(queryset):
        return {row['user_id']: row for row in queryset}

    deposits = by_user(
        Transaction.objects
        .filter(user_id__in=all_player_ids, type=Transaction.TxType.DEPOSIT,
                status=Transaction.Status.COMPLETED, created_at__range=(start, end))
        .values('user_id').annotate(total=_money('amount'))
    )
    withdrawals = by_user(
        Transaction.objects
        .filter(user_id__in=all_player_ids, type=Transaction.TxType.WITHDRAWAL,
                status=Transaction.Status.COMPLETED, created_at__range=(start, end))
        .values('user_id').annotate(total=_money('amount'))
    )
    sports = by_user(
        SportBet.objects
        .filter(user_id__in=all_player_ids, placed_at__range=(start, end),
                status__in=SportBet.SETTLED_STATUSES)
        .values('user_id').annotate(total=_money('profit_loss'))
    )
    casino = by_user(
        GameRound.objects
        .filter(user_id__in=all_player_ids, created_at__range=(start, end))
        .exclude(game__category__in=SPORTS_CATEGORIES)
        .values('user_id')
        .annotate(total=_money(F('bet_amount') - F('win_amount')))
    )

    rows = []
    for agent_id, user_ids in players_by_agent.items():
        row_agent = agents.get(agent_id)
        if not row_agent:
            continue

        def total_for(source):
            return sum(
                (Decimal(source[uid]['total']) for uid in user_ids if uid in source),
                ZERO,
            )

        deposit_total = total_for(deposits)
        withdrawal_total = total_for(withdrawals)
        sports_pl = total_for(sports)
        casino_pl = total_for(casino)
        gross = sports_pl + casino_pl

        rows.append({
            'agentId': agent_id,
            'agent': row_agent.username or row_agent.name,
            'level': row_agent.level,
            'players': len(user_ids),
            'deposits': _q(deposit_total),
            'withdrawals': _q(withdrawal_total),
            'netCash': _q(deposit_total - withdrawal_total),
            'sportsPl': _q(sports_pl),
            'casinoPl': _q(casino_pl),
            'grossRevenue': _q(gross),
            'realRevenue': _q(deposit_total - withdrawal_total),
        })

    rows.sort(key=lambda r: r['grossRevenue'], reverse=True)
    return {
        'summary': _credit_summary(agent, start, end),
        'rows': rows,
        'grandTotal': _grand_total(rows, REVENUE_COLUMNS),
    }


REVENUE_COLUMNS = ['players', 'deposits', 'withdrawals', 'netCash',
                   'sportsPl', 'casinoPl', 'grossRevenue', 'realRevenue']


# ---------------------------------------------------------------------------
# CSV export
#
# One table per report keeps every "Download Excel" button on the panel pointed
# at the same endpoint, and means a new report needs a header list rather than
# a new writer.
# ---------------------------------------------------------------------------

REPORT_BUILDERS = {
    'pl-market': (pl_by_market, [
        ('sport', 'Sport'), ('event', 'Event'), ('market', 'Market'),
        ('totalBets', 'Total Bets'), ('turnover', 'T/O'),
        ('memberWin', 'Member Win'), ('memberComm', 'Member Comm'),
        ('memberPl', 'Member P&L'), ('agentWin', 'Agent Win'),
        ('agentComm', 'Agent Comm'), ('agentPl', 'Agent P&L'),
        ('uplinePl', 'Upline P&L'),
    ]),
    'pl-agent': (pl_by_agent, [
        ('agent', 'Agent'), ('agentName', 'Name'), ('level', 'Level'),
        ('partnership', 'Partnership %'), ('totalBets', 'Total Bets'),
        ('turnover', 'T/O'), ('memberWin', 'Member Win'),
        ('memberComm', 'Member Comm'), ('memberPl', 'Member P&L'),
        ('agentWin', 'Agent Win'), ('agentComm', 'Agent Comm'),
        ('agentPl', 'Agent P&L'), ('uplinePl', 'Upline P&L'),
    ]),
    'event-pl': (event_pl, [
        ('sport', 'Sport'), ('event', 'Event'), ('startTime', 'Start'),
        ('players', 'Players'), ('totalBets', 'Total Bets'),
        ('turnover', 'T/O'), ('memberPl', 'Member P&L'),
        ('agentPl', 'Agent P&L'), ('uplinePl', 'Upline P&L'),
    ]),
    'bet-list': (bet_list, [
        ('placedAt', 'Placed'), ('player', 'Player'), ('event', 'Event'),
        ('market', 'Market'), ('selection', 'Selection'), ('side', 'Side'),
        ('odds', 'Odds'), ('stake', 'Stake'), ('liability', 'Liability'),
        ('profitLoss', 'P&L'), ('status', 'Status'),
    ]),
    'transfer-statement': (transfer_statement, [
        ('date', 'Date'), ('counterparty', 'Account'),
        ('counterpartyType', 'Type'), ('direction', 'Direction'),
        ('amount', 'Amount'), ('balanceAfter', 'Balance After'),
        ('remark', 'Remark'),
    ]),
    'settlement': (settlement_report, [
        ('date', 'Date'), ('counterparty', 'Account'),
        ('counterpartyType', 'Type'), ('amount', 'Amount'),
        ('plBefore', 'P&L Before'), ('plAfter', 'P&L After'),
        ('period', 'Period'), ('note', 'Note'),
    ]),
    'transactions': (transactions_report, [
        ('date', 'Date'), ('player', 'Player'), ('type', 'Type'),
        ('amount', 'Amount'), ('status', 'Status'), ('method', 'Method'),
        ('reference', 'Reference'),
    ]),
    'real-revenue': (real_revenue, [
        ('agent', 'Agent'), ('level', 'Level'), ('players', 'Players'),
        ('deposits', 'Deposits'), ('withdrawals', 'Withdrawals'),
        ('netCash', 'Net Cash'), ('sportsPl', 'Sports P&L'),
        ('casinoPl', 'Casino P&L'), ('grossRevenue', 'Gross Revenue'),
        ('realRevenue', 'Real Revenue'),
    ]),
}


# Reports that page. The rest aggregate to one row per market/agent/event and
# are short by construction, so they take no page argument at all. Listed
# explicitly rather than probed with a TypeError guard, which would swallow a
# real TypeError raised inside a builder and silently re-run it.
PAGINATED_REPORTS = frozenset({
    'bet-list', 'transfer-statement', 'settlement', 'transactions',
})

# One page of a CSV export. High enough that no realistic period is truncated,
# bounded so a runaway export cannot pull the whole book into memory.
CSV_ROW_LIMIT = 50000


def build_report(agent: Agent, kind: str, filters: dict, *, page=0, per_page=50) -> dict:
    entry = REPORT_BUILDERS.get(kind)
    if not entry:
        raise ValueError('Unknown report')
    builder, _headers = entry
    if kind in PAGINATED_REPORTS:
        return builder(agent, filters, page=page, per_page=per_page)
    return builder(agent, filters)


def report_csv_rows(agent: Agent, kind: str, filters: dict):
    """Yield header + data rows for one report.

    Exports the whole result set rather than the current page — a download that
    silently stopped at row 50 would be worse than no download at all.
    """
    entry = REPORT_BUILDERS.get(kind)
    if not entry:
        raise ValueError('Unknown report')
    builder, headers = entry

    if kind in PAGINATED_REPORTS:
        data = builder(agent, filters, page=0, per_page=CSV_ROW_LIMIT)
    else:
        data = builder(agent, filters)

    yield [label for _key, label in headers]
    for row in data.get('rows', []):
        yield [_csv_cell(row.get(key)) for key, _label in headers]

    grand = data.get('grandTotal') or {}
    if grand:
        yield []
        yield ['Grand Total'] + [
            _csv_cell(grand.get(key, '')) for key, _label in headers[1:]
        ]


def _csv_cell(value):
    if value is None:
        return ''
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d %H:%M')
    return value


# ---------------------------------------------------------------------------
# The agent programme: public landing page and applications
#
# An application IS an agent row in `pending` status, not a row in a separate
# table. Approving it therefore mutates one record instead of copying a dozen
# fields between two — and a pending row is invisible to every report for free,
# because `tree_path` stays NULL until approval attaches it to the tree and
# every scoped query is a `tree_path` prefix match.
#
# Submitting is public; reviewing is not. Listing and deciding applications
# live only in :mod:`core.agent_admin_services`, behind an admin token. An
# application carries a stranger's name, email and phone, so no agent panel
# session may read one — not even the upline whose code was typed. The
# resolved upline is still stored on the row, so the console can attach an
# approval at the right place in the tree.
# ---------------------------------------------------------------------------

def get_program_settings() -> dict:
    """Programme-wide configuration, merged over the defaults above.

    Stored as one JSON row in ``platform_settings`` rather than its own table,
    exactly like the affiliate programme: the admin console's existing settings
    endpoints then manage it for free.
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
    """Merge ``values`` over the stored settings and persist them.

    Unknown keys are dropped so a stray field from an older client cannot
    poison the config — the same contract as the affiliate programme's saver.
    """
    current = get_program_settings()
    for key in DEFAULT_PROGRAM_SETTINGS:
        if key in values and values[key] is not None:
            current[key] = values[key]
    PlatformSetting.objects.update_or_create(
        setting_key=SETTINGS_KEY, defaults={'setting_value': current}
    )
    return current


def get_program_overview() -> dict:
    """Public data for the landing page.

    The page quotes the terms the programme actually opens accounts on, rather
    than numbers typed into the marketing copy — those drift the moment anyone
    changes the real defaults.
    """
    settings = get_program_settings()
    return {
        'defaultPartnership': _q(settings['default_partnership']),
        'defaultCommissionRate': _q(settings['default_commission_rate']),
        'defaultLevel': settings['default_level'],
        'currency': settings['currency'],
        'reviewHours': settings['review_hours'],
        # What an agent can open beneath them at the default level, so the page
        # can describe the hierarchy without hardcoding it.
        'levels': [
            {'value': value, 'label': labelText}
            for value, labelText in Agent.Level.choices
        ],
    }


def _normalize_email(value: str) -> str:
    return (value or '').strip().lower()


def apply_as_agent(*, username, password, name, email, phone=None,
                   company_name=None, market_region=None, expected_volume=None,
                   experience=None, notes=None, parent_code=None, ip=None) -> dict:
    """Submit an application. Creates a `pending` agent that cannot log in.

    The applicant chooses their own username and password. Approval turns the
    record into a login as-is; the alternative — an upline generating
    credentials — has to transmit them over some channel, which is worse.
    """
    username = (username or '').strip()
    name = (name or '').strip()
    email = _normalize_email(email)

    if not USERNAME_RE.match(username):
        raise ValueError(
            'Username must be 4-30 characters, letters, numbers, dot or underscore'
        )
    if not name:
        raise ValueError('Your name is required')
    if not EMAIL_RE.match(email):
        raise ValueError('A valid email address is required')
    _validate_password(password)

    # Checked before the insert for a clear message, and again by the unique
    # index below — two applications submitted at the same instant would
    # otherwise both pass this check.
    if Agent.objects.filter(username=username).exists():
        raise ValueError('That username is already taken')
    if Agent.objects.filter(contact_email=email).exists():
        raise ValueError('An application already exists for this email address')

    parent = None
    if parent_code:
        parent = Agent.objects.filter(
            code__iexact=parent_code.strip(), status=Agent.Status.ACTIVE
        ).first()
        # An unknown or inactive upline code downgrades to a direct application
        # rather than rejecting it — the applicant did nothing wrong, and the
        # code they typed is kept for the reviewer to see.
        if not parent:
            logger.info('agent apply: unknown parent code %s, treating as direct',
                        parent_code)

    settings = get_program_settings()
    try:
        with tenant_atomic():
            agent = Agent.objects.create(
                code=_generate_code(),
                username=username,
                password_hash=hash_password(password),
                name=name[:100],
                company_name=(company_name or '').strip()[:150] or None,
                contact_email=email,
                contact_phone=(phone or '').strip()[:20] or None,
                # Proposed, not granted. Approval is what sets the real level,
                # partnership and parent — otherwise an applicant could name
                # their own terms by posting a different payload.
                level=settings['default_level'],
                status=Agent.Status.PENDING,
                partnership=0,
                commission_rate=0,
                market_region=(market_region or '').strip()[:80] or None,
                expected_volume=(expected_volume or '').strip()[:40] or None,
                experience=(experience or '').strip()[:40] or None,
                application_notes=(notes or '').strip() or None,
                requested_parent_code=(parent_code or '').strip()[:20] or None,
                currency=settings['currency'],
                applied_at=timezone.now(),
                # The RESOLVED upline. Nothing is routed by it — every
                # application goes to the one staff queue either way — but it
                # is the placement the console defaults to when approving, so
                # an applicant who typed a valid code lands under that agent
                # without staff having to look it up. An unresolved code leaves
                # this NULL and the console picks the parent by hand;
                # `requested_parent_code` above keeps whatever they actually
                # typed, so the reviewer can still see the mistake.
                #
                # Deliberately still no tree_path: that is what keeps a pending
                # row out of every report, and approval is what sets it.
                parent=parent,
            )
    except IntegrityError as exc:
        raise ValueError('That username is already taken') from exc

    audit(agent.id, 'application.submitted', actor_id=agent.id, actor_label=name,
          target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id,
          metadata={'email': email,
                    'requested_parent': parent.code if parent else None},
          ip=ip)
    return {
        'agentId': agent.id,
        'code': agent.code,
        'username': agent.username,
        'status': agent.status,
        'uplineName': parent.name if parent else None,
        'reviewHours': settings['review_hours'],
    }


def application_status(email: str) -> dict:
    """Let an applicant check their own status.

    An unknown address returns the same shape as a known one, so this endpoint
    cannot be used to enumerate who has applied.
    """
    agent = Agent.objects.filter(contact_email=_normalize_email(email)).first()
    if not agent:
        return {'status': 'unknown', 'appliedAt': None, 'rejectionReason': None}
    return {
        'status': agent.status,
        'statusLabel': agent.get_status_display(),
        'appliedAt': agent.applied_at,
        'approvedAt': agent.approved_at,
        'rejectionReason': agent.rejection_reason,
        # Only useful once approved, and harmless before: it is the code they
        # would hand to their own downline.
        'code': agent.code if agent.status == Agent.Status.ACTIVE else None,
    }
