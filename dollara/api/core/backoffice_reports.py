"""Report aggregations and cashier/mailing config for the backoffice console.

The finance reports share one shape: a total, a day-by-day evolution series,
and breakdowns by country / currency. `_breakdown` builds the breakdown rows
(name, amount, percent) so each report only declares what it groups by.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Max, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from core.models import (
    Game,
    GameProvider,
    GameRound,
    GameSession,
    Transaction,
    User,
    UserBonus,
    UserSetting,
    Wallet,
)
from core.backoffice_models import (
    CashierQueueItem,
    LoginHistory,
    MailConfiguration,
    MailTemplate,
    PaymentBinRule,
    PaymentFrontendRule,
    PaymentMethod,
    PaymentProvider,
    PaymentProviderMethod,
    StaffGroup,
    StaffGroupPermission,
)
from core.backoffice_services import (
    _f,
    _int,
    apply_date_range,
    page_result,
    paging,
    player_label,
)

# Attrition scans players in bulk; cap the scan so one request cannot walk
# an unbounded table.
MAX_ROWS = 5000


# --------------------------------------------------------------------------
# Shared report helpers
# --------------------------------------------------------------------------


def _breakdown(qs, group_field, amount_field='amount', label=None):
    """Group `qs` by one field and return [{name, amount, percent}] rows.

    Percent is each group's share of the grouped total, so the rows sum to
    100% (bar rounding). A zero total yields 0% rather than dividing by zero.
    """
    grouped = (
        qs.values(group_field)
          .annotate(amount=Sum(amount_field))
          .order_by('-amount')
    )
    rows = [
        {'name': g[group_field] or '—', 'amount': _f(g['amount'])}
        for g in grouped
    ]
    total = sum(r['amount'] for r in rows)
    for r in rows:
        r['percent'] = round(r['amount'] / total * 100, 2) if total else 0.0
    return {'label': label or group_field, 'rows': rows, 'total': total}


def _evolution(qs, date_field='created_at', amount_field='amount'):
    """Daily totals for the evolution chart."""
    series = (
        qs.annotate(day=TruncDate(date_field))
          .values('day')
          .annotate(amount=Sum(amount_field), count=Count('id'))
          .order_by('day')
    )
    return [
        {
            'date': s['day'].isoformat() if s['day'] else None,
            'amount': _f(s['amount']),
            'count': s['count'],
        }
        for s in series
    ]


def _tx_qs(params, tx_type, status='completed'):
    """Transactions of one type, filtered by the shared report fields."""
    qs = Transaction.objects.filter(type=tx_type)
    if status:
        qs = qs.filter(status=status)
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    if country := (params.get('country') or '').strip():
        qs = qs.filter(user__country_code=country)
    if currency := (params.get('currency') or '').strip():
        qs = qs.filter(currency=currency)
    if method := (params.get('paymentMethod') or '').strip():
        qs = qs.filter(payment_method=method)
    if (provider_id := _int(params.get('providerId'))) is not None:
        qs = qs.filter(provider_id=provider_id)
    return qs


def _money_report(params, tx_type):
    """The shared finance-report body: total, evolution, breakdowns."""
    qs = _tx_qs(params, tx_type)
    total = _f(qs.aggregate(t=Sum('amount'))['t'])
    return {
        'total': total,
        'count': qs.count(),
        'evolution': _evolution(qs),
        'by_country': _breakdown(qs, 'user__country_code', label='Country'),
        'by_currency': _breakdown(qs, 'currency', label='Currency'),
        'by_method': _breakdown(qs, 'payment_method', label='Payment Method'),
    }


# --------------------------------------------------------------------------
# Finance reports
# --------------------------------------------------------------------------

def deposits_report(params):
    return _money_report(params, 'deposit')


def withdrawals_report(params):
    return _money_report(params, 'withdrawal')


def bonuses_report(params):
    """Player Bonuses: awarded bonus amounts over the window."""
    qs = UserBonus.objects.all()
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    total = _f(qs.aggregate(t=Sum('amount'))['t'])
    evolution = _evolution(qs, 'created_at', 'amount')
    return {
        'total': total,
        'count': qs.count(),
        'evolution': evolution,
        'by_status': _breakdown(qs, 'status', 'amount', label='Status'),
        'by_source': _breakdown(qs, 'source', 'amount', label='Source'),
    }


def adjustments_report(params, kind):
    """Refunds / chargebacks / withdrawal / other adjustments.

    All four reference screens read the same ledger; `kind` picks the slice.
    """
    if kind == 'refund':
        qs = Transaction.objects.filter(type='refund')
    elif kind == 'chargeback':
        # A chargeback is a refund the operator did not initiate; it is flagged
        # in the description because the ledger has no dedicated type.
        qs = Transaction.objects.filter(
            type='refund', notes__icontains='chargeback'
        )
    elif kind == 'withdrawal':
        qs = Transaction.objects.filter(type='adjustment', amount__lt=0)
    else:
        qs = Transaction.objects.filter(type='adjustment')

    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    limit, offset = paging(params)
    total = _f(qs.aggregate(t=Sum('amount'))['t'])
    result = page_result(
        qs.select_related('user').order_by('-created_at'), limit, offset,
        lambda t: {
            'id': t.id,
            'date': t.created_at,
            'player': player_label(t.user),
            'player_id': t.user_id,
            'amount': _f(t.amount),
            'currency': t.currency,
            'status': t.status,
            'method': t.payment_method,
            'notes': t.notes,
        },
    )
    result['total_amount'] = total
    return result


def gross_profit_report(params):
    """Gross Profit: stakes minus winnings over the window."""
    qs = GameRound.objects.all()
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    if currency := (params.get('currency') or '').strip():
        qs = qs.filter(currency=currency)
    if country := (params.get('country') or '').strip():
        qs = qs.filter(user__country_code=country)

    agg = qs.aggregate(bet=Sum('bet_amount'), won=Sum('win_amount'), n=Count('id'))
    bet, won = _f(agg['bet']), _f(agg['won'])

    series = (
        qs.annotate(day=TruncDate('created_at'))
          .values('day')
          .annotate(bet=Sum('bet_amount'), won=Sum('win_amount'))
          .order_by('day')
    )
    evolution = [{
        'date': s['day'].isoformat() if s['day'] else None,
        'bet': _f(s['bet']),
        'won': _f(s['won']),
        'profit': _f(s['bet']) - _f(s['won']),
    } for s in series]

    return {
        'total_bet': bet,
        'total_won': won,
        'gross_profit': bet - won,
        # Hold percentage: what share of every staked rupee the house keeps.
        'margin_percent': round((bet - won) / bet * 100, 2) if bet else 0.0,
        'rounds': agg['n'],
        'evolution': evolution,
    }


def net_profit_report(params):
    """Net Profit: gross profit less bonuses awarded in the same window."""
    gross = gross_profit_report(params)
    bonus_qs = apply_date_range(
        UserBonus.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    bonus_cost = _f(bonus_qs.aggregate(t=Sum('amount'))['t'])
    return {
        **gross,
        'bonus_cost': bonus_cost,
        'net_profit': gross['gross_profit'] - bonus_cost,
    }


def providers_expense_report(params):
    """Providers Expense: turnover and house profit per game provider."""
    qs = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    grouped = (
        qs.values('game__provider_id', 'game__provider__name')
          .annotate(bet=Sum('bet_amount'), won=Sum('win_amount'), n=Count('id'))
          .order_by('-bet')
    )
    rows = [{
        'provider_id': g['game__provider_id'],
        'provider': g['game__provider__name'] or '—',
        'rounds': g['n'],
        'total_bet': _f(g['bet']),
        'total_won': _f(g['won']),
        'profit': _f(g['bet']) - _f(g['won']),
    } for g in grouped]
    return {'rows': rows, 'total': len(rows)}


def payment_methods_report(params):
    """Payment Methods: deposit volume split by method."""
    qs = _tx_qs(params, 'deposit')
    return {
        'total': _f(qs.aggregate(t=Sum('amount'))['t']),
        'by_method': _breakdown(qs, 'payment_method', label='Payment Method'),
        'evolution': _evolution(qs),
    }


# --------------------------------------------------------------------------
# Management reports
# --------------------------------------------------------------------------

def active_players_report(params):
    """Players who staked at least one round in the window."""
    qs = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    grouped = (
        qs.values('user_id', 'user__username', 'user__country_code')
          .annotate(rounds=Count('id'), bet=Sum('bet_amount'), won=Sum('win_amount'))
          .order_by('-bet')
    )
    limit, offset = paging(params)
    total = grouped.count()
    rows = [{
        'player': f'{g["user__username"] or "player"} ({g["user_id"]})',
        'player_id': g['user_id'],
        'country': g['user__country_code'],
        'rounds': g['rounds'],
        'total_bet': _f(g['bet']),
        'total_won': _f(g['won']),
        'profit': _f(g['bet']) - _f(g['won']),
    } for g in grouped[offset:offset + limit]]
    return {'rows': rows, 'total': total, 'limit': limit, 'offset': offset}


def attrition_report(params):
    """Players whose last activity predates the cutoff (default 30 days)."""
    days = _int(params.get('days'), 30) or 30
    cutoff = timezone.now() - timedelta(days=days)

    last_play = {
        r['user_id']: r['last']
        for r in GameRound.objects.values('user_id').annotate(last=Max('created_at'))
    }
    rows = []
    for u in User.objects.filter(role=User.Role.USER).order_by('-created_at')[:MAX_ROWS]:
        last = last_play.get(u.id)
        if last and last >= cutoff:
            continue
        rows.append({
            'player': player_label(u),
            'player_id': u.id,
            'signup_date': u.created_at,
            'last_activity': last,
            'days_inactive': (timezone.now() - last).days if last else None,
            'country': u.country_code,
            'status': u.account_status,
        })
    limit, offset = paging(params)
    return {
        'rows': rows[offset:offset + limit],
        'total': len(rows),
        'limit': limit,
        'offset': offset,
    }


def aging_report(params):
    """Depositors bucketed by how long ago they registered."""
    buckets = [
        ('0-30 days', 0, 30), ('31-60 days', 31, 60), ('61-90 days', 61, 90),
        ('91-180 days', 91, 180), ('181-365 days', 181, 365),
        ('365+ days', 366, 100000),
    ]
    now = timezone.now()
    rows = []
    for label, lo, hi in buckets:
        start = now - timedelta(days=hi)
        end = now - timedelta(days=lo)
        users = User.objects.filter(
            role=User.Role.USER, created_at__gte=start, created_at__lte=end
        ).values_list('id', flat=True)
        user_ids = list(users)
        if not user_ids:
            rows.append({
                'months': label, 'days_range': f'{lo}-{hi}', 'depositors': 0,
                'total_deposit': 0.0, 'total_withdrawal': 0.0, 'withdrawal_count': 0,
            })
            continue
        dep = Transaction.objects.filter(
            user_id__in=user_ids, type='deposit', status='completed'
        ).aggregate(t=Sum('amount'), n=Count('user_id', distinct=True))
        wd = Transaction.objects.filter(
            user_id__in=user_ids, type='withdrawal', status='completed'
        ).aggregate(t=Sum('amount'), n=Count('id'))
        rows.append({
            'months': label,
            'days_range': f'{lo}-{hi}',
            'depositors': dep['n'] or 0,
            'total_deposit': _f(dep['t']),
            'total_withdrawal': _f(wd['t']),
            'withdrawal_count': wd['n'] or 0,
        })
    return {'rows': rows, 'total': len(rows)}


def da_report(params, period='month'):
    """Deposit/withdrawal totals per month or per day."""
    trunc = TruncMonth if period == 'month' else TruncDate
    qs = apply_date_range(
        Transaction.objects.filter(status='completed'),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    grouped = (
        qs.annotate(bucket=trunc('created_at'))
          .values('bucket', 'type')
          .annotate(amount=Sum('amount'), n=Count('id'))
          .order_by('bucket')
    )
    by_bucket: dict = {}
    for g in grouped:
        key = g['bucket'].isoformat() if g['bucket'] else '—'
        entry = by_bucket.setdefault(key, {
            'period': key, 'deposits': 0.0, 'deposit_count': 0,
            'withdrawals': 0.0, 'withdrawal_count': 0,
        })
        if g['type'] == 'deposit':
            entry['deposits'] = _f(g['amount'])
            entry['deposit_count'] = g['n']
        elif g['type'] == 'withdrawal':
            entry['withdrawals'] = _f(g['amount'])
            entry['withdrawal_count'] = g['n']
    rows = sorted(by_bucket.values(), key=lambda r: r['period'])
    for r in rows:
        r['net'] = r['deposits'] - r['withdrawals']
    return {'rows': rows, 'total': len(rows)}


def bonus_analysis_report(params):
    qs = apply_date_range(
        UserBonus.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    grouped = (
        qs.values('status')
          .annotate(n=Count('id'), amount=Sum('amount'))
          .order_by('-amount')
    )
    rows = [{
        'status': g['status'],
        'count': g['n'],
        'amount': _f(g['amount']),
    } for g in grouped]
    return {
        'rows': rows,
        'total': len(rows),
        'total_amount': sum(r['amount'] for r in rows),
    }


def player_wise_report(params):
    """One row per player: deposits, withdrawals, turnover and net position."""
    limit, offset = paging(params)
    users = list(
        User.objects.filter(role=User.Role.USER).order_by('-created_at')
        [offset:offset + limit]
    )
    ids = [u.id for u in users]
    deposits = dict(
        Transaction.objects.filter(user_id__in=ids, type='deposit', status='completed')
        .values('user_id').annotate(t=Sum('amount')).values_list('user_id', 't')
    )
    withdrawals = dict(
        Transaction.objects.filter(user_id__in=ids, type='withdrawal', status='completed')
        .values('user_id').annotate(t=Sum('amount')).values_list('user_id', 't')
    )
    rounds = {
        r['user_id']: r for r in GameRound.objects.filter(user_id__in=ids)
        .values('user_id').annotate(bet=Sum('bet_amount'), won=Sum('win_amount'))
    }
    wallets = {w.user_id: w for w in Wallet.objects.filter(user_id__in=ids)}

    rows = []
    for u in users:
        r = rounds.get(u.id, {})
        bet, won = _f(r.get('bet')), _f(r.get('won'))
        rows.append({
            'player': player_label(u),
            'player_id': u.id,
            'signup_date': u.created_at,
            'country': u.country_code,
            'deposits': _f(deposits.get(u.id)),
            'withdrawals': _f(withdrawals.get(u.id)),
            'total_bet': bet,
            'total_won': won,
            'profit': bet - won,
            'balance': _f(wallets[u.id].main_balance) if u.id in wallets else 0.0,
        })
    return {
        'rows': rows,
        'total': User.objects.filter(role=User.Role.USER).count(),
        'limit': limit,
        'offset': offset,
    }


# --------------------------------------------------------------------------
# Player demographic reports
# --------------------------------------------------------------------------

def signups_report(params):
    qs = apply_date_range(
        User.objects.filter(role=User.Role.USER),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    series = (
        qs.annotate(day=TruncDate('created_at'))
          .values('day').annotate(n=Count('id')).order_by('day')
    )
    evolution = [
        {'date': s['day'].isoformat() if s['day'] else None, 'count': s['n']}
        for s in series
    ]
    return {
        'total': qs.count(),
        'evolution': evolution,
        'by_country': {
            'label': 'Country',
            'rows': [
                {'name': g['country_code'] or '—', 'amount': g['n']}
                for g in qs.values('country_code').annotate(n=Count('id')).order_by('-n')
            ],
        },
    }


def gender_report(params):
    qs = UserSetting.objects.filter(user__role=User.Role.USER)
    grouped = qs.values('gender').annotate(n=Count('id')).order_by('-n')
    rows = [{'name': g['gender'] or 'Unspecified', 'amount': g['n']} for g in grouped]
    total = sum(r['amount'] for r in rows)
    for r in rows:
        r['percent'] = round(r['amount'] / total * 100, 2) if total else 0.0
    return {'rows': rows, 'total': total}


def countries_report(params, metric='signups'):
    if metric == 'signups':
        qs = apply_date_range(
            User.objects.filter(role=User.Role.USER),
            params, 'created_at', 'dateFrom', 'dateTo',
        )
        grouped = qs.values('country_code').annotate(n=Count('id')).order_by('-n')
        rows = [{'name': g['country_code'] or '—', 'amount': g['n']} for g in grouped]
    else:
        qs = apply_date_range(
            GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
        )
        grouped = (
            qs.values('user__country_code')
              .annotate(bet=Sum('bet_amount'), won=Sum('win_amount'))
              .order_by('-bet')
        )
        rows = [{
            'name': g['user__country_code'] or '—',
            'amount': _f(g['bet']) - _f(g['won']),
            'total_bet': _f(g['bet']),
            'total_won': _f(g['won']),
        } for g in grouped]
    total = sum(r['amount'] for r in rows)
    for r in rows:
        r['percent'] = round(r['amount'] / total * 100, 2) if total else 0.0
    return {'rows': rows, 'total': total}


def profitability_report(params):
    """Games ranked by the profit they generate."""
    qs = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    grouped = (
        qs.values('game_id', 'game_name')
          .annotate(n=Count('id'), bet=Sum('bet_amount'), won=Sum('win_amount'))
          .order_by('-bet')
    )
    limit, offset = paging(params)
    total = grouped.count()
    rows = []
    for g in grouped[offset:offset + limit]:
        bet, won = _f(g['bet']), _f(g['won'])
        rows.append({
            'game': g['game_name'] or '—',
            'game_id': g['game_id'],
            'rounds': g['n'],
            'total_bet': bet,
            'total_won': won,
            'profit': bet - won,
            'margin_percent': round((bet - won) / bet * 100, 2) if bet else 0.0,
        })
    return {'rows': rows, 'total': total, 'limit': limit, 'offset': offset}


def bets_done_report(params):
    """Bets Done: every round listed, newest first."""
    qs = apply_date_range(
        GameRound.objects.select_related('user', 'game'),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    if (player_id := _int(params.get('playerId'))) is not None:
        qs = qs.filter(user_id=player_id)
    limit, offset = paging(params)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda r: {
        'id': r.id,
        'date': r.created_at,
        'player': player_label(r.user),
        'player_id': r.user_id,
        'game': r.game_name,
        'bet': _f(r.bet_amount),
        'won': _f(r.win_amount),
        'profit': _f(r.bet_amount) - _f(r.win_amount),
        'status': r.settle_status,
        'currency': r.currency,
    })


def log_history_report(params):
    """Log History: the admin audit trail."""
    from core.models import User as _User

    limit, offset = paging(params)
    # admin_audit_logs has no model in core.models; read it directly.
    from django.db import connection

    where, args = [], []
    if (admin_id := _int(params.get('adminId'))) is not None:
        where.append('admin_id = %s')
        args.append(admin_id)
    if action := (params.get('action') or '').strip():
        where.append('action LIKE %s')
        args.append(f'%{action}%')
    clause = f'WHERE {" AND ".join(where)}' if where else ''

    with connection.cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM admin_audit_logs {clause}', args)
        total = cur.fetchone()[0]
        cur.execute(
            f'''SELECT id, admin_id, action, entity_type, entity_id, ip_address,
                       created_at
                  FROM admin_audit_logs {clause}
                 ORDER BY created_at DESC LIMIT %s OFFSET %s''',
            [*args, limit, offset],
        )
        raw = cur.fetchall()

    admin_ids = {r[1] for r in raw if r[1]}
    admins = dict(
        _User.objects.filter(id__in=admin_ids).values_list('id', 'username')
    ) if admin_ids else {}

    rows = [{
        'id': r[0],
        'admin': admins.get(r[1], r[1]),
        'action': r[2],
        'entity_type': r[3],
        'entity_id': r[4],
        'ip_address': r[5],
        'created_at': r[6],
    } for r in raw]
    return {'rows': rows, 'total': total, 'limit': limit, 'offset': offset}


# --------------------------------------------------------------------------
# Downloadable reports — flat row sets meant for CSV export
# --------------------------------------------------------------------------

def players_data(params):
    limit, offset = paging(params)
    qs = apply_date_range(
        User.objects.filter(role=User.Role.USER),
        params, 'created_at', 'dateFrom', 'dateTo',
    ).order_by('-created_at')
    page = list(qs[offset:offset + limit])
    settings = {
        s.user_id: s for s in UserSetting.objects.filter(
            user_id__in=[u.id for u in page]
        )
    }
    wallets = {
        w.user_id: w for w in Wallet.objects.filter(user_id__in=[u.id for u in page])
    }
    rows = []
    for u in page:
        prefs = settings.get(u.id)
        rows.append({
            'id': u.id,
            'signup_date': u.created_at,
            'username': u.username,
            'full_name': u.full_name,
            'phone': u.phone,
            'country': u.country_code,
            'state': u.state,
            'status': u.account_status,
            'currency': prefs.currency if prefs else 'INR',
            'balance': _f(wallets[u.id].main_balance) if u.id in wallets else 0.0,
        })
    return {'rows': rows, 'total': qs.count(), 'limit': limit, 'offset': offset}


def banned_players_data(params):
    limit, offset = paging(params)
    qs = User.objects.filter(
        role=User.Role.USER, account_status__in=['blocked', 'suspended']
    ).order_by('-updated_at')
    return page_result(qs, limit, offset, lambda u: {
        'id': u.id,
        'player': player_label(u),
        'full_name': u.full_name,
        'phone': u.phone,
        'country': u.country_code,
        'status': u.account_status,
        'signup_date': u.created_at,
        'updated_at': u.updated_at,
    })


def deposits_data(params):
    limit, offset = paging(params)
    qs = _tx_qs(params, 'deposit', status=None).select_related('user')
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda t: {
        'id': t.id,
        'date': t.created_at,
        'player': player_label(t.user),
        'player_id': t.user_id,
        'amount': _f(t.amount),
        'currency': t.currency,
        'method': t.payment_method,
        'provider_payment_id': t.provider_payment_id,
        'status': t.status,
        'error_message': t.error_message,
    })


def bonus_data(params):
    limit, offset = paging(params)
    qs = apply_date_range(
        UserBonus.objects.select_related('user'),
        params, 'created_at', 'dateFrom', 'dateTo',
    ).order_by('-created_at')
    return page_result(qs, limit, offset, lambda b: {
        'id': b.id,
        'date': b.created_at,
        'player': player_label(b.user),
        'player_id': b.user_id,
        'amount': _f(b.amount),
        'status': b.status,
        'source': b.source,
        'expires_at': b.expires_at,
    })


def transaction_history(params):
    limit, offset = paging(params)
    qs = apply_date_range(
        Transaction.objects.select_related('user'),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    if tx_type := (params.get('type') or '').strip():
        qs = qs.filter(type=tx_type)
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)
    if (player_id := _int(params.get('playerId'))) is not None:
        qs = qs.filter(user_id=player_id)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda t: {
        'id': t.id,
        'date': t.created_at,
        'player': player_label(t.user),
        'player_id': t.user_id,
        'type': t.type,
        'amount': _f(t.amount),
        'currency': t.currency,
        'status': t.status,
        'method': t.payment_method,
        'reference': t.reference_number,
    })


def one_page_report(params):
    """One Page Report: the headline numbers for the window."""
    dep = _tx_qs(params, 'deposit')
    wd = _tx_qs(params, 'withdrawal')
    rounds = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    signups = apply_date_range(
        User.objects.filter(role=User.Role.USER),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    bonus = apply_date_range(
        UserBonus.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    r = rounds.aggregate(bet=Sum('bet_amount'), won=Sum('win_amount'), n=Count('id'))
    bet, won = _f(r['bet']), _f(r['won'])
    deposits = _f(dep.aggregate(t=Sum('amount'))['t'])
    withdrawals = _f(wd.aggregate(t=Sum('amount'))['t'])
    bonus_cost = _f(bonus.aggregate(t=Sum('amount'))['t'])
    return {
        'signups': signups.count(),
        'deposits': deposits,
        'deposit_count': dep.count(),
        'withdrawals': withdrawals,
        'withdrawal_count': wd.count(),
        'net_cash': deposits - withdrawals,
        'total_bet': bet,
        'total_won': won,
        'gross_profit': bet - won,
        'bonus_cost': bonus_cost,
        'net_profit': (bet - won) - bonus_cost,
        'rounds': r['n'],
        'active_players': rounds.values('user_id').distinct().count(),
    }


# --------------------------------------------------------------------------
# Cashier system
# --------------------------------------------------------------------------

# Which destination fields each method type uses. The admin form shows only
# these for the chosen type and the deposit page renders only these, so the
# server stores the rest as NULL: switching a method from bank to UPI must not
# leave a stale account number that the player would then be told to pay into.
# `required` is enforced only for deposit-capable methods — a withdrawal-only
# method has nothing for the player to pay into.
DESTINATION_FIELDS = {
    'upi': {'required': ('upi_id',), 'optional': ('qr_image_url', 'account_name')},
    'bank': {
        'required': ('account_name', 'account_number', 'ifsc_code'),
        'optional': ('bank_name', 'branch_name'),
    },
    'crypto': {'required': ('wallet_address',), 'optional': ('crypto_network', 'qr_image_url')},
    'wallet': {'required': ('account_number',), 'optional': ('account_name', 'qr_image_url')},
    'card': {'required': (), 'optional': ()},
    'other': {'required': (), 'optional': ()},
}
ALL_DESTINATION_FIELDS = (
    'account_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name',
    'upi_id', 'qr_image_url', 'crypto_network', 'wallet_address',
)
# Labels for validation messages, so the admin is told which box to fill.
_DESTINATION_LABELS = {
    'upi_id': 'UPI ID',
    'account_name': 'account holder name',
    'account_number': 'account number',
    'ifsc_code': 'IFSC code',
    'wallet_address': 'wallet address',
}
_TYPE_LABELS = {
    'upi': 'UPI', 'bank': 'bank', 'crypto': 'crypto', 'wallet': 'e-wallet',
    'card': 'card', 'other': 'other',
}


def _serialize_payment_method(m):
    return {
        'id': m.id,
        'name': m.name,
        'code': m.code,
        'method_type': m.method_type,
        'logo_url': m.logo_url,
        'supports_deposit': m.supports_deposit,
        'supports_withdrawal': m.supports_withdrawal,
        'min_amount': _f(m.min_amount),
        'max_amount': _f(m.max_amount) if m.max_amount is not None else None,
        'currencies': m.currencies,
        'countries': m.countries,
        # Deposit destination shown to the player (only the fields for the
        # method's type are ever populated — see DESTINATION_FIELDS).
        'account_name': m.account_name,
        'account_number': m.account_number,
        'ifsc_code': m.ifsc_code,
        'bank_name': m.bank_name,
        'branch_name': m.branch_name,
        'upi_id': m.upi_id,
        'qr_image_url': m.qr_image_url,
        'crypto_network': m.crypto_network,
        'wallet_address': m.wallet_address,
        'instructions': m.instructions,
        'is_active': m.is_active,
        'sort_order': m.sort_order,
    }


def list_payment_methods(params):
    qs = PaymentMethod.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    if (active := params.get('isActive')) not in (None, ''):
        qs = qs.filter(is_active=str(active).lower() in ('1', 'true', 'yes'))
    limit, offset = paging(params)
    return page_result(
        qs.order_by('sort_order', 'name'), limit, offset, _serialize_payment_method
    )


def _destination_fields(payload, method_type, supports_deposit):
    """Validate and normalise the destination for `method_type`.

    Returns every field in ALL_DESTINATION_FIELDS, with the ones that do not
    belong to this type forced to None.
    """
    rules = DESTINATION_FIELDS.get(method_type)
    if rules is None:
        raise ValueError(
            'Unknown payment method type; expected one of '
            + ', '.join(DESTINATION_FIELDS)
        )
    allowed = set(rules['required']) | set(rules['optional'])
    cleaned = {
        key: ((payload.get(key) or '').strip() or None) if key in allowed else None
        for key in ALL_DESTINATION_FIELDS
    }

    if supports_deposit:
        missing = [
            _DESTINATION_LABELS.get(key, key.replace('_', ' '))
            for key in rules['required'] if not cleaned.get(key)
        ]
        if missing:
            what = ', '.join(missing)
            kind = _TYPE_LABELS.get(method_type, method_type)
            article = 'an' if kind[0] in 'aeiou' else 'a'
            raise ValueError(
                f'{what[0].upper()}{what[1:]} {"is" if len(missing) == 1 else "are"} '
                f'required for {article} {kind} method that accepts deposits'
            )
        if method_type == 'upi' and '@' not in cleaned['upi_id']:
            raise ValueError('Enter a valid UPI ID (for example name@bank)')
    return cleaned


def save_payment_method(payload, method_id=None):
    name = (payload.get('name') or '').strip()
    code = (payload.get('code') or '').strip()
    if not name:
        raise ValueError('Name is required')
    if not code:
        raise ValueError('Code is required')

    clash = PaymentMethod.objects.filter(code=code)
    if method_id:
        clash = clash.exclude(id=method_id)
    if clash.exists():
        raise ValueError(f'Code "{code}" is already in use')

    method_type = (payload.get('method_type') or 'other').strip().lower()
    supports_deposit = bool(payload.get('supports_deposit', True))
    fields = {
        'name': name,
        'code': code,
        'method_type': method_type,
        'logo_url': (payload.get('logo_url') or '').strip() or None,
        'supports_deposit': supports_deposit,
        'supports_withdrawal': bool(payload.get('supports_withdrawal', False)),
        'min_amount': payload.get('min_amount') or 0,
        'max_amount': payload.get('max_amount') or None,
        'currencies': (payload.get('currencies') or '').strip() or None,
        'countries': (payload.get('countries') or '').strip() or None,
        # The account the player transfers to for a manual deposit.
        **_destination_fields(payload, method_type, supports_deposit),
        'instructions': (payload.get('instructions') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
        'sort_order': _int(payload.get('sort_order'), 0) or 0,
    }
    if method_id:
        updated = PaymentMethod.objects.filter(id=method_id).update(**fields)
        if not updated:
            raise ValueError('Payment method not found')
        return {'id': method_id}
    return {'id': PaymentMethod.objects.create(**fields).id}


def list_payment_providers(params):
    qs = PaymentProvider.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    limit, offset = paging(params)
    return page_result(qs.order_by('name'), limit, offset, lambda p: {
        'id': p.id,
        'name': p.name,
        'code': p.code,
        'api_endpoint': p.api_endpoint,
        'supports_deposit': p.supports_deposit,
        'supports_withdrawal': p.supports_withdrawal,
        'deposit_countries': p.deposit_countries,
        'withdrawal_countries': p.withdrawal_countries,
        'currencies': p.currencies,
        'is_active': p.is_active,
        'created_at': p.created_at,
    })


def save_payment_provider(payload, provider_id=None):
    name = (payload.get('name') or '').strip()
    code = (payload.get('code') or '').strip()
    if not name:
        raise ValueError('Name is required')
    if not code:
        raise ValueError('Code is required')

    clash = PaymentProvider.objects.filter(code=code)
    if provider_id:
        clash = clash.exclude(id=provider_id)
    if clash.exists():
        raise ValueError(f'Code "{code}" is already in use')

    fields = {
        'name': name,
        'code': code,
        'api_endpoint': (payload.get('api_endpoint') or '').strip() or None,
        'credentials': payload.get('credentials') or None,
        'supports_deposit': bool(payload.get('supports_deposit', True)),
        'supports_withdrawal': bool(payload.get('supports_withdrawal', False)),
        'deposit_countries': (payload.get('deposit_countries') or '').strip() or None,
        'withdrawal_countries': (payload.get('withdrawal_countries') or '').strip() or None,
        'currencies': (payload.get('currencies') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
    }
    if provider_id:
        updated = PaymentProvider.objects.filter(id=provider_id).update(**fields)
        if not updated:
            raise ValueError('Payment provider not found')
        return {'id': provider_id}
    return {'id': PaymentProvider.objects.create(**fields).id}


def list_bin_rules(params):
    qs = PaymentBinRule.objects.select_related('provider').all()
    if bin_prefix := (params.get('bin') or '').strip():
        qs = qs.filter(bin_from__startswith=bin_prefix)
    limit, offset = paging(params)
    return page_result(qs.order_by('-priority', 'bin_from'), limit, offset, lambda r: {
        'id': r.id,
        'provider': r.provider.name if r.provider else None,
        'provider_id': r.provider_id,
        'bin_from': r.bin_from,
        'bin_to': r.bin_to,
        'card_brand': r.card_brand,
        'country_code': r.country_code,
        'action': r.action,
        'priority': r.priority,
        'is_active': r.is_active,
    })


def save_bin_rule(payload, rule_id=None):
    bin_from = (payload.get('bin_from') or '').strip()
    if not bin_from or not bin_from.isdigit():
        raise ValueError('BIN from must be numeric')
    bin_to = (payload.get('bin_to') or '').strip() or None
    if bin_to and not bin_to.isdigit():
        raise ValueError('BIN to must be numeric')
    if bin_to and bin_to < bin_from:
        raise ValueError('BIN to must not be lower than BIN from')

    fields = {
        'provider_id': _int(payload.get('provider_id')),
        'bin_from': bin_from,
        'bin_to': bin_to,
        'card_brand': (payload.get('card_brand') or '').strip() or None,
        'country_code': (payload.get('country_code') or '').strip() or None,
        'action': (payload.get('action') or 'allow').strip(),
        'priority': _int(payload.get('priority'), 0) or 0,
        'is_active': bool(payload.get('is_active', True)),
    }
    if rule_id:
        updated = PaymentBinRule.objects.filter(id=rule_id).update(**fields)
        if not updated:
            raise ValueError('BIN rule not found')
        return {'id': rule_id}
    return {'id': PaymentBinRule.objects.create(**fields).id}


def list_frontend_rules(params):
    qs = PaymentFrontendRule.objects.select_related('method').all()
    limit, offset = paging(params)
    return page_result(qs.order_by('display_order'), limit, offset, lambda r: {
        'id': r.id,
        'method': r.method.name if r.method else None,
        'method_id': r.method_id,
        'country_code': r.country_code,
        'currency': r.currency,
        'min_amount': _f(r.min_amount),
        'max_amount': _f(r.max_amount) if r.max_amount is not None else None,
        'display_order': r.display_order,
        'is_visible': r.is_visible,
    })


def save_frontend_rule(payload, rule_id=None):
    fields = {
        'method_id': _int(payload.get('method_id')),
        'country_code': (payload.get('country_code') or '').strip() or None,
        'currency': (payload.get('currency') or '').strip() or None,
        'min_amount': payload.get('min_amount') or 0,
        'max_amount': payload.get('max_amount') or None,
        'display_order': _int(payload.get('display_order'), 0) or 0,
        'is_visible': bool(payload.get('is_visible', True)),
    }
    if rule_id:
        updated = PaymentFrontendRule.objects.filter(id=rule_id).update(**fields)
        if not updated:
            raise ValueError('Front end rule not found')
        return {'id': rule_id}
    return {'id': PaymentFrontendRule.objects.create(**fields).id}


def list_queue(params, queue_type):
    qs = CashierQueueItem.objects.select_related('user').filter(queue_type=queue_type)
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)
    if (player_id := _int(params.get('playerId'))) is not None:
        qs = qs.filter(user_id=player_id)
    limit, offset = paging(params)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda q: {
        'id': q.id,
        'created_at': q.created_at,
        'player': player_label(q.user) if q.user else '',
        'player_id': q.user_id,
        'amount': _f(q.amount),
        'currency': q.currency,
        'reason': q.reason,
        'status': q.status,
        'notes': q.notes,
        'resolved_at': q.resolved_at,
    })


def resolve_queue_item(item_id, status, admin_id, notes=None):
    try:
        item = CashierQueueItem.objects.get(id=item_id)
    except CashierQueueItem.DoesNotExist:
        raise ValueError('Queue item not found')
    if status not in ('approved', 'rejected'):
        raise ValueError('Status must be approved or rejected')
    if item.status != 'pending':
        raise ValueError(f'Item is already {item.status}')
    item.status = status
    item.resolved_by = admin_id
    item.resolved_at = timezone.now()
    if notes:
        item.notes = notes
    item.save()
    return {'id': item.id, 'status': item.status}


# --------------------------------------------------------------------------
# Mailing
# --------------------------------------------------------------------------

def list_templates(params):
    qs = MailTemplate.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    if channel := (params.get('channel') or '').strip():
        qs = qs.filter(channel=channel)
    limit, offset = paging(params)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda t: {
        'id': t.id,
        'name': t.name,
        'subject': t.subject,
        'channel': t.channel,
        'language': t.language,
        'event_key': t.event_key,
        'is_active': t.is_active,
        'created_at': t.created_at,
        'updated_at': t.updated_at,
    })


def get_template(template_id):
    try:
        t = MailTemplate.objects.get(id=template_id)
    except MailTemplate.DoesNotExist:
        raise ValueError('Template not found')
    return {
        'id': t.id, 'name': t.name, 'subject': t.subject, 'channel': t.channel,
        'language': t.language, 'body': t.body, 'event_key': t.event_key,
        'is_active': t.is_active,
    }


def save_template(payload, admin_id, template_id=None):
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('Template name is required')
    channel = (payload.get('channel') or 'email').strip()
    if channel not in ('email', 'sms', 'both'):
        raise ValueError('Channel must be email, sms or both')
    # An email needs a subject line; an SMS has none by nature.
    if channel in ('email', 'both') and not (payload.get('subject') or '').strip():
        raise ValueError('Subject is required for email templates')

    fields = {
        'name': name,
        'subject': (payload.get('subject') or '').strip() or None,
        'channel': channel,
        'language': (payload.get('language') or 'en').strip(),
        'body': payload.get('body') or '',
        'event_key': (payload.get('event_key') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
    }
    if template_id:
        updated = MailTemplate.objects.filter(id=template_id).update(**fields)
        if not updated:
            raise ValueError('Template not found')
        return {'id': template_id}
    return {'id': MailTemplate.objects.create(created_by=admin_id, **fields).id}


def delete_template(template_id):
    deleted, _ = MailTemplate.objects.filter(id=template_id).delete()
    if not deleted:
        raise ValueError('Template not found')
    return {'deleted': True}


def get_configuration(scope):
    if scope not in ('casino', 'email_sms'):
        raise ValueError('Unknown configuration scope')
    return {
        c.config_key: c.config_value
        for c in MailConfiguration.objects.filter(scope=scope)
    }


def save_configuration(scope, values, admin_id):
    if scope not in ('casino', 'email_sms'):
        raise ValueError('Unknown configuration scope')
    if not isinstance(values, dict):
        raise ValueError('Configuration must be an object')
    for key, value in values.items():
        MailConfiguration.objects.update_or_create(
            scope=scope, config_key=str(key)[:80],
            defaults={
                'config_value': None if value is None else str(value),
                'updated_by': admin_id,
            },
        )
    return get_configuration(scope)


# --------------------------------------------------------------------------
# Staff groups / permissions
# --------------------------------------------------------------------------

def list_staff_groups(params):
    qs = StaffGroup.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    limit, offset = paging(params)
    counts = dict(
        User.objects.filter(role=User.Role.ADMIN, staff_group_id__isnull=False)
        .values('staff_group_id')
        .annotate(n=Count('id'))
        .values_list('staff_group_id', 'n')
    )
    perm_counts = dict(
        StaffGroupPermission.objects.values('group_id')
        .annotate(n=Count('id'))
        .values_list('group_id', 'n')
    )
    return page_result(qs.order_by('name'), limit, offset, lambda g: {
        'id': g.id,
        'name': g.name,
        'description': g.description,
        'is_active': g.is_active,
        'members': counts.get(g.id, 0),
        'permissions': perm_counts.get(g.id, 0),
        'created_at': g.created_at,
    })


def get_staff_group(group_id):
    try:
        g = StaffGroup.objects.get(id=group_id)
    except StaffGroup.DoesNotExist:
        raise ValueError('Group not found')
    perms = [
        {'module': p.module, 'permission': p.permission}
        for p in StaffGroupPermission.objects.filter(group_id=group_id)
    ]
    return {
        'id': g.id, 'name': g.name, 'description': g.description,
        'is_active': g.is_active, 'permissions': perms,
    }


def save_staff_group(payload, admin_id, group_id=None):
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('Group name is required')
    clash = StaffGroup.objects.filter(name=name)
    if group_id:
        clash = clash.exclude(id=group_id)
    if clash.exists():
        raise ValueError(f'A group named "{name}" already exists')

    if group_id:
        group = StaffGroup.objects.filter(id=group_id).first()
        if not group:
            raise ValueError('Group not found')
        group.name = name
        group.description = (payload.get('description') or '').strip() or None
        group.is_active = bool(payload.get('is_active', True))
        group.save()
    else:
        group = StaffGroup.objects.create(
            name=name,
            description=(payload.get('description') or '').strip() or None,
            is_active=bool(payload.get('is_active', True)),
            created_by=admin_id,
        )

    # Permissions are sent as the complete desired set, so replace wholesale.
    perms = payload.get('permissions')
    if perms is not None:
        StaffGroupPermission.objects.filter(group_id=group.id).delete()
        seen = set()
        for p in perms:
            module = str(p.get('module', '')).strip()
            permission = str(p.get('permission', '')).strip()
            if not module or not permission or (module, permission) in seen:
                continue
            seen.add((module, permission))
            StaffGroupPermission.objects.create(
                group_id=group.id, module=module, permission=permission
            )
    return {'id': group.id}


def delete_staff_group(group_id):
    if User.objects.filter(staff_group_id=group_id).exists():
        raise ValueError('Cannot delete a group that still has members')
    deleted, _ = StaffGroup.objects.filter(id=group_id).delete()
    if not deleted:
        raise ValueError('Group not found')
    return {'deleted': True}


# --------------------------------------------------------------------------
# Remaining reference reports
# --------------------------------------------------------------------------

def real_revenue_report(params):
    """Real Revenue: what the house actually kept, net of bonus cost.

    'Real' is the distinction the reference draws between turnover-based gross
    profit and the revenue left once bonus money is deducted.
    """
    rounds = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    agg = rounds.aggregate(bet=Sum('bet_amount'), won=Sum('win_amount'), n=Count('id'))
    bet, won = _f(agg['bet']), _f(agg['won'])
    gross = bet - won

    bonus_cost = _f(
        apply_date_range(
            UserBonus.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
        ).aggregate(t=Sum('amount'))['t']
    )

    series = (
        rounds.annotate(day=TruncDate('created_at'))
              .values('day')
              .annotate(bet=Sum('bet_amount'), won=Sum('win_amount'))
              .order_by('day')
    )
    return {
        'total_bet': bet,
        'total_won': won,
        'gross_profit': gross,
        'bonus_cost': bonus_cost,
        'real_revenue': gross - bonus_cost,
        'margin_percent': round(gross / bet * 100, 2) if bet else 0.0,
        'rounds': agg['n'],
        'evolution': [{
            'date': s['day'].isoformat() if s['day'] else None,
            'amount': _f(s['bet']) - _f(s['won']),
        } for s in series],
    }


def free_money_analysis_report(params):
    """Free Money Analysis: bonus money awarded against what it turned over.

    'Free money' is the bonus; the turnover it generated is the wagering the
    player actually completed against it.
    """
    qs = apply_date_range(
        UserBonus.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    agg = qs.aggregate(
        awarded=Sum('amount'),
        wagered=Sum('wagering_completed'),
        required=Sum('wagering_required'),
        n=Count('id'),
    )
    awarded = _f(agg['awarded'])
    wagered = _f(agg['wagered'])

    grouped = (
        qs.values('source')
          .annotate(n=Count('id'), amount=Sum('amount'), wagered=Sum('wagering_completed'))
          .order_by('-amount')
    )
    rows = [{
        'source': g['source'],
        'count': g['n'],
        'awarded': _f(g['amount']),
        'wagered': _f(g['wagered']),
        # How many times over the bonus was played through.
        'turnover_ratio': (
            round(_f(g['wagered']) / _f(g['amount']), 2) if _f(g['amount']) else 0.0
        ),
    } for g in grouped]

    return {
        'total_awarded': awarded,
        'total_wagered': wagered,
        'total_required': _f(agg['required']),
        'awards': agg['n'],
        'turnover_ratio': round(wagered / awarded, 2) if awarded else 0.0,
        'rows': rows,
        'total': len(rows),
    }


def jackpot_contribution_report(params):
    """Jackpot contribution: the slice of each stake feeding the jackpot pool.

    No jackpot pool is modelled on this platform, so the contribution rate is
    taken from platform_settings when present. With no rate configured the
    report returns zeros and says so rather than inventing a number.
    """
    from core.models import PlatformSetting

    rate_row = PlatformSetting.objects.filter(
        setting_key='jackpot_contribution_percent'
    ).first()
    rate = _f(rate_row.setting_value) if rate_row else 0.0

    rounds = apply_date_range(
        GameRound.objects.all(), params, 'created_at', 'dateFrom', 'dateTo'
    )
    agg = rounds.aggregate(bet=Sum('bet_amount'), n=Count('id'))
    bet = _f(agg['bet'])

    grouped = (
        rounds.values('game_id', 'game_name')
              .annotate(bet=Sum('bet_amount'), n=Count('id'))
              .order_by('-bet')
    )
    rows = [{
        'game': g['game_name'] or '—',
        'game_id': g['game_id'],
        'rounds': g['n'],
        'total_bet': _f(g['bet']),
        'contribution': round(_f(g['bet']) * rate / 100, 2),
    } for g in grouped]

    return {
        'contribution_rate': rate,
        'configured': rate_row is not None,
        'total_bet': bet,
        'total_contribution': round(bet * rate / 100, 2),
        'rounds': agg['n'],
        'rows': rows,
        'total': len(rows),
        'note': (
            None if rate_row
            else 'No jackpot contribution rate is configured, so every '
                 'contribution reads zero. Set '
                 '`jackpot_contribution_percent` in platform settings.'
        ),
    }


def players_campaign_report(params):
    """Players Campaign: signups and value grouped by acquisition campaign.

    Attribution runs through the affiliate programme, which is what this
    platform records as the campaign source.
    """
    qs = apply_date_range(
        UserSetting.objects.filter(user__role=User.Role.USER),
        params, 'created_at', 'dateFrom', 'dateTo',
    )
    grouped = (
        qs.filter(affiliate_id__isnull=False)
          .values('affiliate_id')
          .annotate(players=Count('id'))
          .order_by('-players')
    )
    rows = list(grouped)
    affiliate_ids = [r['affiliate_id'] for r in rows]

    names = {}
    if affiliate_ids:
        try:
            from core.affiliate_models import Affiliate

            names = dict(
                Affiliate.objects.filter(id__in=affiliate_ids)
                .values_list('id', 'name')
            )
        except Exception:  # pragma: no cover - affiliate module optional
            names = {}

    # Money each campaign's players brought in.
    user_ids_by_campaign = {}
    for aid in affiliate_ids:
        user_ids_by_campaign[aid] = list(
            qs.filter(affiliate_id=aid).values_list('user_id', flat=True)
        )

    out = []
    for r in rows:
        aid = r['affiliate_id']
        uids = user_ids_by_campaign.get(aid, [])
        deposits = _f(
            Transaction.objects.filter(
                user_id__in=uids, type='deposit', status='completed'
            ).aggregate(t=Sum('amount'))['t']
        )
        rounds = GameRound.objects.filter(user_id__in=uids).aggregate(
            bet=Sum('bet_amount'), won=Sum('win_amount')
        )
        out.append({
            'campaign': names.get(aid, f'Affiliate {aid}'),
            'affiliate_id': aid,
            'players': r['players'],
            'deposits': deposits,
            'total_bet': _f(rounds['bet']),
            'profit': _f(rounds['bet']) - _f(rounds['won']),
        })

    return {'rows': out, 'total': len(out)}


def sports_report(params):
    """Sports Report: sportsbook stakes and house result.

    Reads `sport_bets`, which is empty until the sportsbook starts taking
    stakes; the screen then renders an explicit note rather than blank rows.
    """
    from core.agent_models import SportEvent  # noqa: F401 - documents the join

    try:
        from django.db import connection

        where, args = [], []
        date_from = params.get('dateFrom')
        date_to = params.get('dateTo')
        if date_from:
            where.append('b.placed_at >= %s')
            args.append(date_from)
        if date_to:
            where.append('b.placed_at < DATE_ADD(%s, INTERVAL 1 DAY)')
            args.append(date_to)
        if sport := (params.get('sport') or '').strip():
            where.append('e.sport = %s')
            args.append(sport)
        clause = f'WHERE {" AND ".join(where)}' if where else ''

        with connection.cursor() as cur:
            cur.execute(
                f'''SELECT e.sport,
                           COUNT(b.id),
                           COALESCE(SUM(b.stake), 0),
                           COALESCE(SUM(b.profit_loss), 0),
                           COALESCE(SUM(b.exposure), 0)
                      FROM sport_bets b
                      JOIN sport_events e ON e.id = b.event_id
                      {clause}
                     GROUP BY e.sport
                     ORDER BY 3 DESC''',
                args,
            )
            raw = cur.fetchall()
    except Exception:
        raw = []

    rows = [{
        'sport': r[0],
        'bets': r[1],
        'total_stake': _f(r[2]),
        'profit': _f(r[3]),
        'exposure': _f(r[4]),
    } for r in raw]

    return {
        'rows': rows,
        'total': len(rows),
        'total_stake': sum(r['total_stake'] for r in rows),
        'total_profit': sum(r['profit'] for r in rows),
        'note': (
            None if rows
            else 'No sportsbook bets have been placed yet, so this report is '
                 'empty. It will populate once sport_bets carries stakes.'
        ),
    }
