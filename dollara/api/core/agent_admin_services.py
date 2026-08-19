"""Staff-facing logic for the agent programme.

The console side of everything in :mod:`core.agent_services`: reviewing
applications, opening accounts anywhere in the tree, changing commercial terms,
funding and clawing back credit, and reading the audit trail. Split from the
panel module along the trust boundary, exactly as
:mod:`core.affiliate_admin_services` is split from ``affiliate_services`` —
nothing here is reachable with an agent token, and nothing in the panel module
can move an account it does not own.

Two things differ from the panel and are the whole reason this module exists:

**Scope.** Every read in ``agent_services`` starts from ``downline_ids``. Staff
have no position in the tree, so nothing here is scoped at all — the console
sees every agent, and ``_assert_can_review`` has no counterpart.

**The root.** ``create_client`` and the panel's ``approve_application`` both
debit the caller's balance, which means neither can open or fund an account at
the top of the tree. The console can: a parentless approval becomes a root, and
:func:`adjust_credit` injects platform credit that came from nobody's balance.

Serialization is snake_case here, matching the rest of the admin console, and
deliberately unlike the camelCase ``agent_services`` serves the agent panel.
Two different clients, two different conventions; the boundary is this file.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from core.agent_models import (Agent, AgentAuditLog, AgentSettlement,
                               AgentTransfer)
from core.agent_services import (ZERO, _money, _q, _validate_password, audit,
                                 get_program_settings, save_program_settings)
from core.models import User, UserSetting, Wallet
from core.services import hash_password
from tenants.state import tenant_atomic

logger = logging.getLogger('agent')

# Statuses a live account can be moved between from the console. The
# application statuses are absent on purpose: an approved agent cannot be sent
# back to `pending`, because approval is what attached it to the tree and there
# is no un-attach.
ACCOUNT_STATUSES = (
    Agent.Status.ACTIVE,
    Agent.Status.SUSPENDED,
    Agent.Status.LOCKED,
    Agent.Status.CLOSED,
)


def _actor_label(admin_id) -> str:
    if not admin_id:
        return 'system'
    row = User.objects.filter(id=admin_id).values('username', 'full_name').first()
    if not row:
        return f'admin:{admin_id}'
    return row['username'] or row['full_name'] or f'admin:{admin_id}'


def _staff_audit(agent_id, admin_id, action, **kwargs):
    """Record a console action against the agent it was performed on.

    ``agent_audit_logs.agent_id`` is nullable only from migration 005 onwards,
    which is what lets a programme-wide change (settings) be recorded at all.
    :func:`core.agent_services.audit` never raises, so on a database that
    predates the migration the settings row is simply not written rather than
    failing the request that earned it.
    """
    audit(agent_id, action, actor_id=admin_id, actor_label=_actor_label(admin_id),
          **kwargs)


def _dt(value):
    return value.isoformat() if value else None


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

def _serialize_application(agent: Agent) -> dict:
    return {
        'id': agent.id,
        'code': agent.code,
        'username': agent.username,
        'name': agent.name,
        'company': agent.company_name or 'Individual',
        'email': agent.contact_email,
        'phone': agent.contact_phone,
        'market_region': agent.market_region,
        'expected_volume': agent.expected_volume,
        'experience': agent.experience,
        'notes': agent.application_notes,
        'requested_parent_code': agent.requested_parent_code,
        'parent_agent_id': agent.parent_id,
        'parent_name': agent.parent.name if agent.parent else None,
        'status': agent.status,
        'status_label': agent.get_status_display(),
        'rejection_reason': agent.rejection_reason,
        'applied_at': _dt(agent.applied_at or agent.created_at),
    }


def list_applications(*, status=None, limit=50, offset=0) -> dict:
    """Every application, whoever it was addressed to.

    The panel's queue is routed on ``parent_id`` so an upline only sees its own.
    Staff review is the backstop for all of them, including the ones that
    resolved to nobody, so there is no routing clause here at all.
    """
    qs = Agent.objects.select_related('parent')
    if status and status != 'all':
        qs = qs.filter(status=status)
    else:
        qs = qs.filter(status__in=Agent.APPLICATION_STATUSES)

    total = qs.count()
    rows = qs.order_by('-applied_at', '-created_at')[offset:offset + limit]
    return {
        'records': [_serialize_application(a) for a in rows],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'pending': Agent.objects.filter(status=Agent.Status.PENDING).count(),
            'info_requested': Agent.objects.filter(
                status=Agent.Status.INFO_REQUESTED).count(),
        },
        'levels': [{'value': v, 'label': label} for v, label in Agent.Level.choices],
    }


def _levels_below(parent: Agent | None) -> list[str]:
    """Levels an account may be opened at beneath ``parent``.

    A parentless account is a root and may sit at any level — there is nothing
    above it for the ordering to violate.
    """
    if parent is None:
        return [str(value) for value in Agent.LEVEL_ORDER]
    return parent.can_create_below


def approve_application(application_id: int, admin_id: int, payload: dict) -> dict:
    """Attach an application to the tree and make it a live account.

    The console may place it anywhere: under a named parent, or — with no
    parent — at the root, which is the one thing the panel's own approval
    cannot do. Opening credit is debited from the parent when there is one and
    injected by the platform when there is not.
    """
    application = Agent.objects.filter(id=application_id).first()
    if not application:
        raise ValueError('That application does not exist')
    if not application.is_application:
        raise ValueError('That application has already been decided')

    settings = get_program_settings()

    parent = None
    # `parentAgentId` absent entirely means "use the upline the applicant
    # named"; present-but-blank means "make this a root", which is a decision
    # staff have to be able to state explicitly.
    parent_id = payload.get('parentAgentId', application.parent_id or '')
    if parent_id not in ('', None):
        parent = Agent.objects.filter(id=int(parent_id)).first()
        if not parent:
            raise ValueError('That parent agent does not exist')
        if parent.is_application:
            raise ValueError('That parent has not been approved yet')
        if parent.id == application.id:
            raise ValueError('An agent cannot be its own parent')

    level = payload.get('level') or settings['default_level']
    if level not in _levels_below(parent):
        raise ValueError('That level does not sit below the chosen parent')

    partnership = Decimal(str(
        settings['default_partnership'] if payload.get('partnership') is None
        else payload['partnership']
    ))
    if partnership < 0 or partnership > 100:
        raise ValueError('Partnership must be between 0 and 100')
    commission_rate = Decimal(str(
        settings['default_commission_rate'] if payload.get('commissionRate') is None
        else payload['commissionRate']
    ))
    credit = Decimal(str(payload.get('credit') or 0))
    if credit < 0:
        raise ValueError('Opening credit cannot be negative')

    with tenant_atomic():
        application = Agent.objects.select_for_update().get(id=application_id)
        if not application.is_application:
            raise ValueError('That application has already been decided')

        if parent is not None:
            # Locked and re-checked inside the transaction for the same reason
            # create_client does it: two approvals at the same instant would
            # otherwise both pass a check made against the same stale balance.
            parent = Agent.objects.select_for_update().get(id=parent.id)
            if credit > parent.available_credit:
                raise ValueError(
                    f'Opening credit exceeds {parent.name}\'s available credit'
                )

        application.parent_id = parent.id if parent else None
        application.level = level
        application.depth = (parent.depth + 1) if parent else 1
        base_path = f'{parent.tree_path or f"/{parent.id}/"}' if parent else '/'
        application.tree_path = f'{base_path}{application.id}/'
        application.partnership = partnership
        application.commission_rate = commission_rate
        application.status = Agent.Status.ACTIVE
        application.is_active = True
        application.rejection_reason = None
        application.approved_at = timezone.now()
        application.approved_by = admin_id
        application.created_by = admin_id
        application.credit_reference = credit
        application.balance = credit
        application.save()

        if credit > 0:
            if parent is not None:
                parent.balance = Decimal(parent.balance or 0) - credit
                parent.save(update_fields=['balance', 'updated_at'])
                AgentTransfer.objects.create(
                    agent_id=parent.id,
                    counterparty_type=AgentTransfer.CounterpartyType.AGENT,
                    counterparty_id=application.id,
                    direction=AgentTransfer.Direction.DOWN,
                    amount=credit,
                    agent_balance_after=parent.balance,
                    counterparty_balance_after=application.balance,
                    remark='Opening credit on approval',
                    performed_by=admin_id,
                )
            else:
                _platform_transfer(application, credit,
                                   AgentTransfer.Direction.UP, admin_id,
                                   'Opening credit on approval')

    _staff_audit(application.id, admin_id, 'admin.application.approved',
                 target_type=AgentAuditLog.TargetType.AGENT,
                 target_id=application.id,
                 metadata={'level': level, 'partnership': str(partnership),
                           'credit': str(credit),
                           'parent': parent.code if parent else None})
    return get_agent_detail(application.id)


def decide_application(application_id: int, admin_id: int, *, decision,
                       reason=None) -> dict:
    """Reject an application, or send it back for more information."""
    if decision not in (Agent.Status.REJECTED, Agent.Status.INFO_REQUESTED):
        raise ValueError('Unknown decision')

    application = Agent.objects.filter(id=application_id).first()
    if not application:
        raise ValueError('That application does not exist')
    if not application.is_application:
        raise ValueError('That application has already been decided')
    reason = (reason or '').strip()
    if not reason:
        raise ValueError('Give a reason — the applicant is shown it.')

    application.status = decision
    application.rejection_reason = reason[:500]
    application.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    _staff_audit(application.id, admin_id, f'admin.application.{decision}',
                 target_type=AgentAuditLog.TargetType.AGENT,
                 target_id=application.id, metadata={'reason': reason})
    return _serialize_application(application)


# ---------------------------------------------------------------------------
# Agent list and detail
# ---------------------------------------------------------------------------

def list_agents(*, status=None, level=None, q=None, limit=100, offset=0) -> dict:
    qs = Agent.objects.select_related('parent').exclude(
        status__in=Agent.APPLICATION_STATUSES
    )
    if status and status != 'all':
        qs = qs.filter(status=status)
    if level:
        qs = qs.filter(level=level)
    if q:
        qs = qs.filter(
            Q(name__icontains=q) | Q(username__icontains=q) | Q(code__icontains=q)
            | Q(contact_email__icontains=q)
        )

    total = qs.count()
    rows = list(qs.order_by('depth', 'username')[offset:offset + limit])
    ids = [a.id for a in rows]

    # Two aggregates for the whole page rather than two queries per row.
    player_counts = dict(
        UserSetting.objects.filter(agent_id__in=ids)
        .values('agent_id').annotate(n=Count('id'))
        .values_list('agent_id', 'n')
    ) if ids else {}
    child_counts = dict(
        Agent.objects.filter(parent_id__in=ids)
        .exclude(status__in=Agent.APPLICATION_STATUSES)
        .values('parent_id').annotate(n=Count('id'))
        .values_list('parent_id', 'n')
    ) if ids else {}

    return {
        'records': [
            {
                'id': row.id,
                'code': row.code,
                'username': row.username,
                'name': row.name,
                'level': row.level,
                'level_label': row.get_level_display(),
                'depth': row.depth,
                # Carried into the list so the console can rule out a reparent
                # that would loop the tree before offering it, rather than only
                # learning from the refusal.
                'tree_path': row.tree_path,
                'parent_agent_id': row.parent_id,
                'parent_name': row.parent.name if row.parent else None,
                'status': row.status,
                'partnership': _q(row.partnership),
                'commission_rate': _q(row.commission_rate),
                'credit_reference': _q(row.credit_reference),
                'balance': _q(row.balance),
                'exposure': _q(row.exposure),
                'available_credit': _q(row.available_credit),
                'settled_pl': _q(row.settled_pl),
                'unsettled_pl': _q(row.unsettled_pl),
                'players': player_counts.get(row.id, 0),
                'downline': child_counts.get(row.id, 0),
                'bet_locked': row.bet_locked,
                'user_locked': row.user_locked,
                'joined_at': _dt(row.approved_at or row.created_at),
                'last_login_at': _dt(row.last_login_at),
            }
            for row in rows
        ],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': _list_summary(),
        'levels': [{'value': v, 'label': label} for v, label in Agent.Level.choices],
    }


def _list_summary() -> dict:
    live = Agent.objects.exclude(status__in=Agent.APPLICATION_STATUSES)
    totals = live.aggregate(
        balance=_money('balance'),
        exposure=_money('exposure'),
        unsettled=_money('unsettled_pl'),
    )
    return {
        'active': live.filter(status=Agent.Status.ACTIVE).count(),
        'suspended': live.filter(
            status__in=[Agent.Status.SUSPENDED, Agent.Status.LOCKED]).count(),
        'total_balance': _q(totals['balance']),
        'total_exposure': _q(totals['exposure']),
        'total_unsettled_pl': _q(totals['unsettled']),
        'pending_applications': Agent.objects.filter(
            status=Agent.Status.PENDING).count(),
    }


def get_agent_detail(agent_id: int) -> dict:
    """Everything the detail screen's tabs need, in one response."""
    agent = Agent.objects.select_related('parent').filter(id=agent_id).first()
    if not agent:
        raise ValueError('Agent not found')

    detail = _serialize_application(agent)
    detail.update({
        'level': agent.level,
        'level_label': agent.get_level_display(),
        'levels_below': agent.can_create_below,
        'depth': agent.depth,
        'tree_path': agent.tree_path,
        'currency': agent.currency,
        'timezone': agent.timezone,
        'partnership': _q(agent.partnership),
        'commission_rate': _q(agent.commission_rate),
        'commission_type': agent.commission_type,
        'credit_reference': _q(agent.credit_reference),
        'balance': _q(agent.balance),
        'exposure': _q(agent.exposure),
        'available_credit': _q(agent.available_credit),
        'settled_pl': _q(agent.settled_pl),
        'unsettled_pl': _q(agent.unsettled_pl),
        'total_commission': _q(agent.total_commission),
        'pending_commission': _q(agent.pending_commission),
        'bet_locked': agent.bet_locked,
        'user_locked': agent.user_locked,
        'must_change_password': agent.must_change_password,
        'is_application': agent.is_application,
        'joined_at': _dt(agent.approved_at or agent.created_at),
        'last_login_at': _dt(agent.last_login_at),
        'last_login_ip': agent.last_login_ip,
    })

    # The whole subtree, not just the direct children: the console's question is
    # "how much sits under this account", which the panel never has to ask
    # because an agent is always looking at its own one level.
    path = agent.tree_path or f'/{agent.id}/'
    subtree_ids = list(
        Agent.objects.filter(tree_path__startswith=path)
        .values_list('id', flat=True)
    )
    if agent.id not in subtree_ids:
        subtree_ids.append(agent.id)

    subtree = Agent.objects.filter(id__in=subtree_ids).exclude(id=agent.id)
    subtree_totals = subtree.aggregate(
        balance=_money('balance'), exposure=_money('exposure'))
    player_count = UserSetting.objects.filter(agent_id__in=subtree_ids).count()

    detail['stats'] = {
        'downline_agents': subtree.count(),
        'downline_players': player_count,
        'direct_children': Agent.objects.filter(parent_id=agent.id).exclude(
            status__in=Agent.APPLICATION_STATUSES).count(),
        'downline_balance': _q(subtree_totals['balance']),
        'net_exposure': _q(
            Decimal(agent.exposure or 0) + Decimal(subtree_totals['exposure'])
        ),
    }

    children = list(
        Agent.objects.filter(parent_id=agent.id)
        .exclude(status__in=Agent.APPLICATION_STATUSES)
        .order_by('username')[:100]
    )
    child_players = dict(
        UserSetting.objects.filter(agent_id__in=[c.id for c in children])
        .values('agent_id').annotate(n=Count('id'))
        .values_list('agent_id', 'n')
    ) if children else {}
    detail['downline'] = [
        {
            'id': c.id,
            'code': c.code,
            'username': c.username,
            'name': c.name,
            'level': c.level,
            'level_label': c.get_level_display(),
            'status': c.status,
            'balance': _q(c.balance),
            'exposure': _q(c.exposure),
            'partnership': _q(c.partnership),
            'players': child_players.get(c.id, 0),
        }
        for c in children
    ]

    detail['players'] = _direct_players(agent)
    detail['transfers'] = _transfer_rows(
        AgentTransfer.objects.filter(agent_id=agent.id).order_by('-created_at')[:100]
    )
    detail['settlements'] = _settlement_rows(
        AgentSettlement.objects.filter(agent_id=agent.id).order_by('-created_at')[:100]
    )
    detail['activity_log'] = _audit_rows(
        AgentAuditLog.objects.filter(agent_id=agent.id).order_by('-created_at')[:100]
    )
    return detail


def _direct_players(agent: Agent, limit: int = 100) -> list[dict]:
    """Players attached to this account itself, with their wallet balance."""
    prefs = list(
        UserSetting.objects.filter(agent_id=agent.id)
        .order_by('-user_id')[:limit]
    )
    user_ids = [p.user_id for p in prefs]
    if not user_ids:
        return []

    users = {
        u['id']: u
        for u in User.objects.filter(id__in=user_ids)
        .values('id', 'username', 'full_name', 'account_status', 'created_at')
    }
    wallets = {
        w['user_id']: w
        for w in Wallet.objects.filter(user_id__in=user_ids)
        .values('user_id', 'main_balance', 'exposure_balance')
    }
    rows = []
    for pref in prefs:
        user = users.get(pref.user_id) or {}
        wallet = wallets.get(pref.user_id) or {}
        rows.append({
            'id': pref.user_id,
            'username': user.get('username') or f'#{pref.user_id}',
            'name': user.get('full_name'),
            'status': user.get('account_status'),
            'balance': _q(wallet.get('main_balance')),
            'exposure': _q(wallet.get('exposure_balance')),
            'joined_at': _dt(user.get('created_at')),
        })
    return rows


# ---------------------------------------------------------------------------
# Terms, status and lifecycle
# ---------------------------------------------------------------------------

def _would_create_cycle(agent_id: int, new_parent_id: int) -> bool:
    """Walk up from the proposed parent looking for this agent.

    ``tree_path`` would answer this too, but only for rows whose path was
    actually stamped. Walking ``parent_id`` is the check that still holds on a
    row with a missing path, which is exactly the row a reparent is most likely
    to be fixing.
    """
    seen = set()
    current = new_parent_id
    while current and current not in seen:
        if current == agent_id:
            return True
        seen.add(current)
        current = Agent.objects.filter(id=current).values_list(
            'parent_id', flat=True).first()
    return False


def _restamp_subtree(agent: Agent) -> int:
    """Rewrite ``tree_path`` and ``depth`` for everything under ``agent``.

    Every scoped read in the panel is a ``tree_path`` prefix match, so a
    reparent that moved only the agent itself would leave its whole downline
    hanging off the old branch — visible to the previous upline and invisible
    to the new one. Walked level by level rather than by string surgery on the
    old prefix, because a row with a NULL path has no prefix to rewrite.
    """
    moved = 0
    frontier = [agent]
    while frontier:
        parent = frontier.pop()
        children = list(Agent.objects.filter(parent_id=parent.id))
        for child in children:
            child.depth = parent.depth + 1
            child.tree_path = f'{parent.tree_path}{child.id}/'
            child.save(update_fields=['depth', 'tree_path', 'updated_at'])
            moved += 1
        frontier.extend(children)
    return moved


def update_agent(agent_id: int, admin_id: int, payload: dict) -> dict:
    """Change an agent's commercial terms, locks, or position in the tree."""
    agent = Agent.objects.filter(id=agent_id).first()
    if not agent:
        raise ValueError('Agent not found')
    if agent.is_application:
        raise ValueError('Decide this application before editing its terms')

    before = {
        'level': agent.level,
        'partnership': _q(agent.partnership),
        'commission_rate': _q(agent.commission_rate),
        'parent_agent_id': agent.parent_id,
        'bet_locked': agent.bet_locked,
        'user_locked': agent.user_locked,
    }

    if payload.get('partnership') is not None:
        value = Decimal(str(payload['partnership'] or 0))
        if value < 0 or value > 100:
            raise ValueError('Partnership must be between 0 and 100')
        agent.partnership = value
    if payload.get('commissionRate') is not None:
        value = Decimal(str(payload['commissionRate'] or 0))
        if value < 0 or value > 100:
            raise ValueError('Commission rate must be between 0 and 100')
        agent.commission_rate = value
    if 'betLocked' in payload:
        agent.bet_locked = bool(payload['betLocked'])
    if 'userLocked' in payload:
        agent.user_locked = bool(payload['userLocked'])
    if payload.get('name'):
        agent.name = str(payload['name'])[:100]
    if 'contactEmail' in payload:
        agent.contact_email = (payload['contactEmail'] or '').strip()[:255] or None
    if 'contactPhone' in payload:
        agent.contact_phone = (payload['contactPhone'] or '').strip()[:20] or None

    # Level and parent are decided together: a level is only legal relative to
    # whatever the parent ends up being, so validating them separately would let
    # a two-field edit land in a state neither field alone could reach.
    reparented = False
    new_parent = agent.parent
    if 'parentAgentId' in payload:
        raw = payload['parentAgentId']
        new_parent_id = int(raw) if raw not in ('', None) else None
        if new_parent_id != agent.parent_id:
            if new_parent_id == agent.id:
                raise ValueError('An agent cannot be its own parent')
            if new_parent_id is not None:
                new_parent = Agent.objects.filter(id=new_parent_id).first()
                if not new_parent:
                    raise ValueError('That parent agent does not exist')
                if new_parent.is_application:
                    raise ValueError('That parent has not been approved yet')
                if _would_create_cycle(agent.id, new_parent_id):
                    raise ValueError(
                        'That would create a loop in the tree — the chosen parent '
                        'already sits below this agent.'
                    )
            else:
                new_parent = None
            reparented = True

    level = payload.get('level') or agent.level
    if level not in Agent.Level.values:
        raise ValueError('Unknown level')
    if level != agent.level or reparented:
        if level not in _levels_below(new_parent):
            raise ValueError('That level does not sit below the chosen parent')
        agent.level = level

    with tenant_atomic():
        if reparented:
            agent.parent = new_parent
            agent.depth = (new_parent.depth + 1) if new_parent else 1
            base_path = (
                f'{new_parent.tree_path or f"/{new_parent.id}/"}'
                if new_parent else '/'
            )
            agent.tree_path = f'{base_path}{agent.id}/'
        agent.save()
        if reparented:
            _restamp_subtree(agent)

    _staff_audit(agent.id, admin_id, 'admin.agent.updated',
                 target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id,
                 metadata={'before': before, 'reparented': reparented})
    return get_agent_detail(agent.id)


def set_agent_status(agent_id: int, admin_id: int, status: str) -> dict:
    agent = Agent.objects.filter(id=agent_id).first()
    if not agent:
        raise ValueError('Agent not found')
    if status not in ACCOUNT_STATUSES:
        raise ValueError('Choose a valid status.')
    if agent.is_application:
        raise ValueError('Decide this application before changing its status')

    before = {'status': agent.status, 'is_active': agent.is_active}
    agent.status = status
    # `is_active` is what the login path checks, so it has to follow the status
    # rather than be a second switch someone can forget to flip.
    agent.is_active = status == Agent.Status.ACTIVE
    agent.save(update_fields=['status', 'is_active', 'updated_at'])

    _staff_audit(agent.id, admin_id, f'admin.agent.{status}',
                 target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id,
                 metadata={'before': before})
    return {'id': agent.id, 'status': agent.status}


def reset_password(agent_id: int, admin_id: int, password: str) -> dict:
    """Set a new password and force a change at next sign-in.

    An account whose password someone else chose is not an audit identity until
    its owner has replaced it, which is why the flag is never optional here.
    """
    agent = Agent.objects.filter(id=agent_id).first()
    if not agent:
        raise ValueError('Agent not found')
    _validate_password(password)

    agent.password_hash = hash_password(password)
    agent.must_change_password = True
    agent.save(update_fields=['password_hash', 'must_change_password', 'updated_at'])

    _staff_audit(agent.id, admin_id, 'admin.agent.password_reset',
                 target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id)
    return {'id': agent.id, 'must_change_password': True}


def delete_agent(agent_id: int, admin_id: int) -> dict:
    """Remove an agent.

    Refused while anything still hangs off it. Deleting cascades the transfers,
    settlements and audit rows away, and an account holding credit or carrying
    open exposure has to be unwound deliberately before its history disappears.
    """
    agent = Agent.objects.filter(id=agent_id).first()
    if not agent:
        raise ValueError('Agent not found')

    if Agent.objects.filter(parent_id=agent.id).exists():
        raise ValueError(
            'Reassign this agent\'s downline first — deleting would orphan it.'
        )
    if UserSetting.objects.filter(agent_id=agent.id).exists():
        raise ValueError('Move this agent\'s players to another account first.')
    if Decimal(agent.balance or 0) != ZERO:
        raise ValueError(
            f'This agent still holds a balance of {_q(agent.balance)}. '
            'Withdraw it before deleting.'
        )
    if Decimal(agent.exposure or 0) != ZERO:
        raise ValueError('This agent still has open exposure on unsettled bets.')

    code = agent.code
    _staff_audit(None, admin_id, 'admin.agent.deleted',
                 target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id,
                 metadata={'code': code, 'username': agent.username,
                           'name': agent.name})
    agent.delete()
    return {'deleted': True, 'code': code}


# ---------------------------------------------------------------------------
# Credit
#
# The panel moves credit between an agent and its own downline, so both sides
# of every transfer are rows in `agents`. A platform injection has no second
# side: the money is created by the operator, not moved from anyone. It is
# written as a self-referencing transfer — `agent_id` and `counterparty_id` are
# the same account — which keeps it on the agent's own Transfer Statement and
# in its credit summary without needing a third counterparty_type the ENUM does
# not have. The remark names the admin, so it never reads as a downline move.
# ---------------------------------------------------------------------------

def _platform_transfer(agent: Agent, amount: Decimal, direction: str,
                       admin_id: int, remark: str) -> AgentTransfer:
    return AgentTransfer.objects.create(
        agent_id=agent.id,
        counterparty_type=AgentTransfer.CounterpartyType.AGENT,
        counterparty_id=agent.id,
        direction=direction,
        amount=amount,
        agent_balance_after=agent.balance,
        counterparty_balance_after=agent.balance,
        remark=f'{remark} · platform ({_actor_label(admin_id)})'[:255],
        performed_by=admin_id,
    )


def adjust_credit(agent_id: int, admin_id: int, *, amount, remark=None) -> dict:
    """Add platform credit to an agent, or take it back.

    ``amount`` is signed: positive funds the account, negative claws back. A
    clawback is capped at available credit rather than balance — credit already
    committed to open bets is not the operator's to remove.
    """
    amount = Decimal(str(amount or 0))
    if amount == ZERO:
        raise ValueError('Amount must not be zero')

    with tenant_atomic():
        agent = Agent.objects.select_for_update().filter(id=agent_id).first()
        if not agent:
            raise ValueError('Agent not found')
        if agent.is_application:
            raise ValueError('Approve this application before funding it')

        if amount < ZERO and -amount > agent.available_credit:
            raise ValueError(
                'That exceeds the credit this agent has free of open bets '
                f'({_q(agent.available_credit)}).'
            )

        agent.balance = Decimal(agent.balance or 0) + amount
        # credit_reference means "what has been extended to me", so it tracks
        # the injection the same way a downline transfer moves the child's.
        agent.credit_reference = max(
            Decimal(agent.credit_reference or 0) + amount, ZERO
        )
        agent.save(update_fields=['balance', 'credit_reference', 'updated_at'])

        transfer = _platform_transfer(
            agent, abs(amount),
            AgentTransfer.Direction.UP if amount > ZERO
            else AgentTransfer.Direction.DOWN,
            admin_id, (remark or '').strip()[:180] or 'Credit adjustment',
        )

    _staff_audit(agent.id, admin_id, 'admin.credit.adjusted',
                 target_type=AgentAuditLog.TargetType.AGENT, target_id=agent.id,
                 metadata={'amount': str(amount), 'remark': remark})
    return {
        'id': transfer.id,
        'agent_id': agent.id,
        'balance': _q(agent.balance),
        'available_credit': _q(agent.available_credit),
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


def _agent_labels(rows) -> dict:
    return dict(
        Agent.objects.filter(id__in={r.agent_id for r in rows})
        .values_list('id', 'username')
    )


def _transfer_rows(rows) -> list[dict]:
    rows = list(rows)
    labels = _counterparty_labels(rows)
    agents = _agent_labels(rows)
    return [
        {
            'id': row.id,
            'agent_id': row.agent_id,
            'agent_name': agents.get(row.agent_id) or f'#{row.agent_id}',
            'counterparty': labels.get(
                (row.counterparty_type, row.counterparty_id),
                f'#{row.counterparty_id}',
            ),
            'counterparty_type': row.counterparty_type,
            # A self-referencing row is the platform injection described above,
            # and is labelled as such rather than as a transfer to itself.
            'is_platform': (row.counterparty_type == 'agent'
                            and row.counterparty_id == row.agent_id),
            'direction': row.direction,
            'amount': _q(row.amount),
            'balance_after': _q(row.agent_balance_after),
            'remark': row.remark or '—',
            'created_at': _dt(row.created_at),
        }
        for row in rows
    ]


def _settlement_rows(rows) -> list[dict]:
    rows = list(rows)
    labels = _counterparty_labels(rows)
    agents = _agent_labels(rows)
    return [
        {
            'id': row.id,
            'agent_id': row.agent_id,
            'agent_name': agents.get(row.agent_id) or f'#{row.agent_id}',
            'counterparty': labels.get(
                (row.counterparty_type, row.counterparty_id),
                f'#{row.counterparty_id}',
            ),
            'counterparty_type': row.counterparty_type,
            'amount': _q(row.amount),
            'pl_before': _q(row.pl_before),
            'pl_after': _q(row.pl_after),
            'period_start': row.period_start.isoformat() if row.period_start else None,
            'period_end': row.period_end.isoformat() if row.period_end else None,
            'note': row.note or '—',
            'created_at': _dt(row.created_at),
        }
        for row in rows
    ]


def list_transfers(*, agent_id=None, direction=None, date_from=None, date_to=None,
                   limit=100, offset=0) -> dict:
    qs = AgentTransfer.objects.all()
    if agent_id:
        qs = qs.filter(agent_id=agent_id)
    if direction:
        qs = qs.filter(direction=direction)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    total = qs.count()
    by_direction = {
        row['direction']: row['total']
        for row in qs.values('direction').annotate(total=_money('amount'))
    }
    return {
        'records': _transfer_rows(qs.order_by('-created_at')[offset:offset + limit]),
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'credit_down': _q(by_direction.get('down')),
            'credit_up': _q(by_direction.get('up')),
        },
    }


def list_settlements(*, agent_id=None, date_from=None, date_to=None,
                     limit=100, offset=0) -> dict:
    qs = AgentSettlement.objects.all()
    if agent_id:
        qs = qs.filter(agent_id=agent_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    total = qs.count()
    return {
        'records': _settlement_rows(qs.order_by('-created_at')[offset:offset + limit]),
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'settled': _q(qs.aggregate(t=Sum('amount'))['t'] or 0),
        },
    }


# ---------------------------------------------------------------------------
# Settings and audit
# ---------------------------------------------------------------------------

def get_settings() -> dict:
    return get_program_settings()


def update_settings(payload: dict, admin_id: int) -> dict:
    before = get_program_settings()
    updated = save_program_settings(payload or {})
    _staff_audit(None, admin_id, 'admin.settings.updated',
                 metadata={'before': before, 'after': updated})
    return updated


def _audit_rows(rows) -> list[dict]:
    rows = list(rows)
    agents = dict(
        Agent.objects.filter(id__in={r.agent_id for r in rows if r.agent_id})
        .values_list('id', 'name')
    )
    return [
        {
            'id': row.id,
            'agent_id': row.agent_id,
            'agent_name': agents.get(row.agent_id),
            'actor_id': row.actor_id,
            'actor_label': row.actor_label,
            'action': row.action,
            'target_type': row.target_type,
            'target_id': row.target_id,
            'metadata': row.metadata,
            'ip': row.ip_address,
            'created_at': _dt(row.created_at),
        }
        for row in rows
    ]


def list_audit_log(*, agent_id=None, action=None, date_from=None, date_to=None,
                   limit=100, offset=0) -> dict:
    qs = AgentAuditLog.objects.all()
    if agent_id:
        qs = qs.filter(agent_id=agent_id)
    if action:
        qs = qs.filter(action__icontains=action)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    total = qs.count()
    return {
        'records': _audit_rows(qs.order_by('-created_at')[offset:offset + limit]),
        'total': total,
        'limit': limit,
        'offset': offset,
    }
