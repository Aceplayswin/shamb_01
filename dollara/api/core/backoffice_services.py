"""Business logic for the backoffice-parity console screens.

Each function here backs one reference screen. The screens are uniformly
"filter panel + results table", so the shared helpers at the top (paging,
date-range parsing, player labels) do most of the work and each screen
function is just its own filter set plus a row shape.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
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
from core.ip_tracking import invalidate_rules_cache, normalize_ip
from core.backoffice_models import (
    BlockedIp,
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

# --------------------------------------------------------------------------
# Shared helpers
# --------------------------------------------------------------------------

DEFAULT_LIMIT = 50
MAX_LIMIT = 500


def _int(value, default=None):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def _dec(value, default=None):
    try:
        return Decimal(str(value).strip())
    except (TypeError, ValueError, ArithmeticError):
        return default


def paging(params) -> tuple[int, int]:
    """`limit`/`offset` from a query dict, clamped to a sane range."""
    limit = _int(params.get('limit'), DEFAULT_LIMIT) or DEFAULT_LIMIT
    offset = _int(params.get('offset'), 0) or 0
    return max(1, min(limit, MAX_LIMIT)), max(0, offset)


def parse_date(value):
    """Accept `YYYY-MM-DD` or a full ISO timestamp; return None if unusable.

    The result is made timezone-aware in the active timezone — comparing a
    naive datetime against a tz-aware DateTimeField warns and silently
    misaligns the boundary by the UTC offset.
    """
    if not value:
        return None
    text = str(value).strip()
    for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S'):
        try:
            parsed = datetime.strptime(text, fmt)
        except ValueError:
            continue
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    return None


def apply_date_range(qs, params, field='created_at', from_key='dateFrom', to_key='dateTo'):
    """Filter `qs` on an inclusive date range.

    The `to` bound is widened to the end of that day so a same-day from/to —
    which is what every reference screen defaults to — still matches rows.
    """
    start = parse_date(params.get(from_key))
    end = parse_date(params.get(to_key))
    if start:
        qs = qs.filter(**{f'{field}__gte': start})
    if end:
        qs = qs.filter(**{f'{field}__lt': end + timedelta(days=1)})
    return qs


def page_result(qs, limit, offset, row_fn):
    """Serialise a page of `qs`, returning rows plus the unpaged total."""
    total = qs.count()
    rows = [row_fn(obj) for obj in qs[offset:offset + limit]]
    return {'rows': rows, 'total': total, 'limit': limit, 'offset': offset}


def player_label(user) -> str:
    """"username (id)" — how the reference screens identify a player."""
    if not user:
        return ''
    return f'{user.username or user.full_name or "player"} ({user.id})'


def _f(value) -> float:
    return float(value or 0)


def _settings_map(user_ids):
    """user_id -> UserSetting for a batch of users, in one query."""
    return {
        s.user_id: s
        for s in UserSetting.objects.filter(user_id__in=list(user_ids))
    }


def _wallet_map(user_ids):
    return {
        w.user_id: w for w in Wallet.objects.filter(user_id__in=list(user_ids))
    }


# --------------------------------------------------------------------------
# Users — Users List / Create Player
# --------------------------------------------------------------------------

def _player_qs():
    return User.objects.filter(role=User.Role.USER)


def list_users(params):
    """Users List: the reference's nine filters over the player table."""
    qs = _player_qs()
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')

    if (user_id := _int(params.get('userId'))) is not None:
        qs = qs.filter(id=user_id)
    if username := (params.get('username') or '').strip():
        qs = qs.filter(username__icontains=username)
    if full_name := (params.get('fullName') or '').strip():
        qs = qs.filter(full_name__icontains=full_name)
    if phone := (params.get('phone') or '').strip():
        qs = qs.filter(phone__icontains=phone)
    if ip := (params.get('ip') or '').strip():
        qs = qs.filter(signup_ip__icontains=ip)
    if status := (params.get('status') or '').strip():
        qs = qs.filter(account_status=status)

    # Affiliate lives on user_settings, so it filters through the reverse join.
    if (affiliate_id := _int(params.get('affiliateId'))) is not None:
        qs = qs.filter(usersetting__affiliate_id=affiliate_id)

    qs = qs.order_by('-created_at')
    limit, offset = paging(params)
    total = qs.count()
    page = list(qs[offset:offset + limit])

    settings = _settings_map(u.id for u in page)
    creator_ids = {u.created_by for u in page if u.created_by}
    creators = dict(
        User.objects.filter(id__in=creator_ids).values_list('id', 'username')
    ) if creator_ids else {}

    rows = []
    for u in page:
        prefs = settings.get(u.id)
        rows.append({
            'id': u.id,
            'signup_date': u.created_at,
            'username': u.username,
            'full_name': u.full_name,
            'country': u.country_code,
            'state': u.state,
            'ip': u.signup_ip,
            'phone': u.phone,
            'created_by': creators.get(u.created_by),
            'account_status': u.account_status,
            'affiliate_id': prefs.affiliate_id if prefs else None,
        })
    return {'rows': rows, 'total': total, 'limit': limit, 'offset': offset}


# --------------------------------------------------------------------------
# Users — Search Plays
# --------------------------------------------------------------------------

def _rounds_qs(params):
    """GameRound filtered by the play-search fields shared across screens."""
    qs = GameRound.objects.all()
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')

    if (player_id := _int(params.get('playerId'))) is not None:
        qs = qs.filter(user_id=player_id)
    if username := (params.get('username') or '').strip():
        qs = qs.filter(user__username__icontains=username)
    if (game_id := _int(params.get('gameId'))) is not None:
        qs = qs.filter(game_id=game_id)
    if game_name := (params.get('gameName') or '').strip():
        qs = qs.filter(game_name__icontains=game_name)
    if currency := (params.get('currency') or '').strip():
        qs = qs.filter(currency=currency)
    if (provider_id := _int(params.get('providerId'))) is not None:
        qs = qs.filter(game__provider_id=provider_id)
    if (affiliate_id := _int(params.get('affiliateId'))) is not None:
        qs = qs.filter(user__usersetting__affiliate_id=affiliate_id)
    if (amount_from := _dec(params.get('amountFrom'))) is not None:
        qs = qs.filter(bet_amount__gte=amount_from)
    if (amount_to := _dec(params.get('amountUntil'))) is not None:
        qs = qs.filter(bet_amount__lte=amount_to)

    # Profit filter is on the round's outcome from the house's point of view:
    # the house profits when the player wins less than they staked.
    profit = (params.get('profit') or '').strip().lower()
    if profit == 'yes':
        qs = qs.filter(win_amount__lt=F('bet_amount'))
    elif profit == 'no':
        qs = qs.filter(win_amount__gte=F('bet_amount'))
    return qs


def search_plays(params):
    """Search Plays: totals panel + the list of individual rounds."""
    qs = _rounds_qs(params).select_related('user', 'game', 'game__provider')
    totals = qs.aggregate(bet=Sum('bet_amount'), won=Sum('win_amount'))
    total_bet = _f(totals['bet'])
    total_won = _f(totals['won'])

    limit, offset = paging(params)
    total = qs.count()
    page = list(qs.order_by('-created_at')[offset:offset + limit])

    rows = [{
        'id': r.id,
        'date': r.created_at,
        'player': player_label(r.user),
        'player_id': r.user_id,
        'game': f'{r.game_name or (r.game.name if r.game else "")} ({r.game_id or ""})',
        'provider': (
            f'{r.game.provider.name} ({r.game.provider_id})'
            if r.game and r.game.provider else ''
        ),
        'bet': _f(r.bet_amount),
        'won': _f(r.win_amount),
        # Profit is the house's, i.e. the inverse of the player's result.
        'profit': _f(r.bet_amount) - _f(r.win_amount),
    } for r in page]

    return {
        'totals': {
            'total_bet': total_bet,
            'won_amount': total_won,
            'profit': total_bet - total_won,
        },
        'rows': rows,
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def players_online(params):
    """Players Online: sessions seen within the recency window (default 15m)."""
    minutes = _int(params.get('minutes'), 15) or 15
    since = timezone.now() - timedelta(minutes=minutes)

    recent = (
        GameSession.objects.filter(last_played_at__gte=since)
        .values_list('user_id', flat=True)
        .distinct()
    )
    user_ids = set(recent)
    # A player who logged in but has not launched a game is online too.
    user_ids |= set(
        LoginHistory.objects.filter(created_at__gte=since, user_id__isnull=False)
        .values_list('user_id', flat=True)
        .distinct()
    )

    users = list(_player_qs().filter(id__in=user_ids).order_by('-last_login_at'))
    settings = _settings_map(u.id for u in users)
    wallets = _wallet_map(u.id for u in users)

    login_counts = dict(
        LoginHistory.objects.filter(user_id__in=user_ids)
        .values('user_id')
        .annotate(n=Count('id'))
        .values_list('user_id', 'n')
    )
    deposit_totals = dict(
        Transaction.objects.filter(
            user_id__in=user_ids, type='deposit', status='completed'
        )
        .values('user_id')
        .annotate(total=Sum('amount'))
        .values_list('user_id', 'total')
    )

    rows = []
    for u in users:
        prefs = settings.get(u.id)
        wallet = wallets.get(u.id)
        rows.append({
            'signup_date': u.created_at,
            'player': player_label(u),
            'player_id': u.id,
            'full_name': u.full_name,
            'country': u.country_code,
            'ip': u.signup_ip,
            'phone': u.phone,
            'state': u.account_status,
            'logins': login_counts.get(u.id, 0),
            'deposits': 'Yes' if deposit_totals.get(u.id) else 'No',
            'balance': _f(wallet.main_balance) if wallet else 0.0,
            'currency': prefs.currency if prefs else 'INR',
        })
    limit, offset = paging(params)
    return {
        'rows': rows[offset:offset + limit],
        'total': len(rows),
        'limit': limit,
        'offset': offset,
    }


# --------------------------------------------------------------------------
# Risk — Blocked IP / Blocked Credit Cards
# --------------------------------------------------------------------------

def list_blocked_ips(params):
    qs = BlockedIp.objects.all()
    if ip := (params.get('ip') or '').strip():
        qs = qs.filter(ip_address__icontains=ip)
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)
    qs = qs.order_by('-created_at')
    limit, offset = paging(params)
    return page_result(qs, limit, offset, lambda b: {
        'id': b.id,
        'ip_address': b.ip_address,
        'status': b.status,
        'comments': b.comments or b.reason,
        'created_at': b.created_at,
        'updated_at': b.updated_at,
    })


def create_blocked_ip(ip_address, status, comments, admin_id):
    raw = (ip_address or '').strip()
    if not raw:
        raise ValueError('IP address is required')
    # Store the canonical form so the runtime check can match it. Without this a
    # typo, or an equivalent-but-differently-spelled IPv6 address, becomes a
    # rule that is listed in the BO but never fires.
    ip_address = normalize_ip(raw)
    if not ip_address:
        raise ValueError(f'"{raw}" is not a valid IP address')
    if status not in ('block', 'allow'):
        raise ValueError('Status must be block or allow')

    obj, created = BlockedIp.objects.update_or_create(
        ip_address=ip_address,
        defaults={
            'status': status,
            'comments': (comments or '').strip() or None,
            'blocked_by': admin_id,
        },
    )
    invalidate_rules_cache()
    return {'id': obj.id, 'created': created}


def update_blocked_ip(rule_id, status=None, comments=None):
    try:
        obj = BlockedIp.objects.get(id=rule_id)
    except BlockedIp.DoesNotExist:
        raise ValueError('Blocked IP not found')
    if status is not None:
        if status not in ('block', 'allow'):
            raise ValueError('Status must be block or allow')
        obj.status = status
    if comments is not None:
        obj.comments = comments.strip() or None
    obj.save()
    invalidate_rules_cache()
    return {'id': obj.id}


def delete_blocked_ip(rule_id):
    deleted, _ = BlockedIp.objects.filter(id=rule_id).delete()
    if not deleted:
        raise ValueError('Blocked IP not found')
    invalidate_rules_cache()
    return {'deleted': True}


# --------------------------------------------------------------------------
# Bonus — Bonus List / Create Bonus wizard / Exchange Bonus
# --------------------------------------------------------------------------

def list_bonuses(params):
    """Bonus List: the reference's five filters over the bonus definitions."""
    from core.models import Bonus

    qs = Bonus.objects.all()
    if code := (params.get('bonusCode') or '').strip():
        qs = qs.filter(promo_code__icontains=code)
    if name := (params.get('bonusName') or '').strip():
        qs = qs.filter(Q(name__icontains=name) | Q(display_title__icontains=name))
    if bonus_type := (params.get('bonusType') or '').strip():
        qs = qs.filter(bonus_type=bonus_type)
    if redemption := (params.get('redemptionType') or '').strip():
        qs = qs.filter(redemption_type=redemption)
    if (affiliate_id := _int(params.get('affiliateId'))) is not None:
        qs = qs.filter(affiliate_id=affiliate_id)
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)

    qs = qs.order_by('-created_at')
    limit, offset = paging(params)
    return page_result(qs, limit, offset, lambda b: {
        'id': b.id,
        'bonus_name': b.display_title or b.name,
        'bonus_code': b.promo_code,
        'bonus_type': b.bonus_type,
        'redemption_type': b.redemption_type,
        'start_date': b.start_date,
        'end_date': b.end_date,
        'status': b.status,
        'is_published': b.is_published,
        'is_public': b.is_public,
        'priority': b.priority,
        'affiliate_id': b.affiliate_id,
        'is_new_player_only': b.is_new_player_only,
        'new_player_days': b.new_player_days,
        'total_awarded': _f(b.total_awarded),
        'total_claims': b.total_claims,
    })


def get_bonus_excluded_affiliates(bonus_id):
    """Affiliate ids barred from this bonus. Empty means every affiliate."""
    from core.backoffice_models import BonusExcludedAffiliate

    return list(
        BonusExcludedAffiliate.objects.filter(bonus_id=bonus_id)
        .values_list('affiliate_id', flat=True)
    )


def set_bonus_excluded_affiliates(bonus_id, affiliate_ids):
    """Replace the exclusion set wholesale — the screen submits the full list."""
    from core.models import Bonus
    from core.backoffice_models import BonusExcludedAffiliate

    if not Bonus.objects.filter(id=bonus_id).exists():
        raise ValueError('Bonus not found')
    if not isinstance(affiliate_ids, (list, tuple)):
        raise ValueError('Expected a list of affiliate ids')

    wanted = {aid for aid in (_int(a) for a in affiliate_ids) if aid is not None}
    BonusExcludedAffiliate.objects.filter(bonus_id=bonus_id).delete()
    BonusExcludedAffiliate.objects.bulk_create(
        [
            BonusExcludedAffiliate(bonus_id=bonus_id, affiliate_id=aid)
            for aid in sorted(wanted)
        ]
    )
    return {'bonus_id': bonus_id, 'excluded': sorted(wanted)}


def get_bonus_translations(bonus_id):
    """Coupon Sets: the player-facing copy, keyed by language."""
    from core.backoffice_models import BonusTranslation

    return [
        {
            'language': t.language,
            'title': t.title,
            'description': t.description,
            'image_url': t.image_url,
            'terms_conditions': t.terms_conditions,
        }
        for t in BonusTranslation.objects.filter(bonus_id=bonus_id).order_by('language')
    ]


def save_bonus_translation(bonus_id, payload):
    from core.models import Bonus
    from core.backoffice_models import BonusTranslation

    if not Bonus.objects.filter(id=bonus_id).exists():
        raise ValueError('Bonus not found')
    language = (payload.get('language') or 'en').strip()
    if not language:
        raise ValueError('Language is required')
    title = (payload.get('title') or '').strip()
    if not title:
        raise ValueError('Title is required')

    obj, _created = BonusTranslation.objects.update_or_create(
        bonus_id=bonus_id,
        language=language,
        defaults={
            'title': title,
            'description': (payload.get('description') or '').strip() or None,
            'image_url': (payload.get('image_url') or '').strip() or None,
            'terms_conditions': (payload.get('terms_conditions') or '').strip() or None,
        },
    )
    return {'id': obj.id, 'language': obj.language}


def delete_bonus_translation(bonus_id, language):
    from core.backoffice_models import BonusTranslation

    deleted, _ = BonusTranslation.objects.filter(
        bonus_id=bonus_id, language=language
    ).delete()
    if not deleted:
        raise ValueError('Translation not found')
    return {'deleted': True}


def bonus_eligibility(bonus_id, username):
    """Exchange Bonus: can this player redeem this bonus?

    Runs the checks the reference's Abuse and Exclude Affiliates tabs
    configure, and reports every reason it fails rather than only the first —
    an operator looking at a refused redemption wants the whole picture.
    """
    from core.models import Bonus, UserBonus
    from core.backoffice_models import BonusExcludedAffiliate
    from core import bonus_services

    username = (username or '').strip()
    if not username:
        raise ValueError('Username is required')
    try:
        bonus = Bonus.objects.get(id=bonus_id)
    except Bonus.DoesNotExist:
        raise ValueError('Bonus not found')

    user = User.objects.filter(username=username, role=User.Role.USER).first()
    if user is None and username.isdigit():
        user = User.objects.filter(id=int(username), role=User.Role.USER).first()
    if user is None:
        raise ValueError(f'No player found for "{username}"')

    reasons = []
    now = timezone.now()

    if bonus.status != 'active':
        reasons.append(f'Bonus status is {bonus.status}, not active')
    if bonus.start_date and bonus.start_date > now:
        reasons.append('Bonus has not started yet')
    if bonus.end_date and bonus.end_date < now:
        reasons.append('Bonus has expired')
    if user.account_status != 'active':
        reasons.append(f'Player account is {user.account_status}')

    prefs = UserSetting.objects.filter(user_id=user.id).first()

    # Per-user claim ceiling.
    already = UserBonus.objects.filter(user_id=user.id, bonus_id=bonus.id).count()
    if bonus.per_user_limit is not None and already >= bonus.per_user_limit:
        reasons.append(
            f'Player already claimed this {already} time(s); limit is {bonus.per_user_limit}'
        )

    # Budget ceiling across all players.
    if bonus.total_budget is not None and bonus.total_awarded >= bonus.total_budget:
        reasons.append('Bonus budget is exhausted')

    # Excluded affiliates.
    if prefs and prefs.affiliate_id:
        if BonusExcludedAffiliate.objects.filter(
            bonus_id=bonus.id, affiliate_id=prefs.affiliate_id
        ).exists():
            reasons.append(f'Player\'s affiliate ({prefs.affiliate_id}) is excluded')

    # Old players excluded: the same cutoff the engine refuses on.
    cutoff = bonus_services.old_player_cutoff(bonus, now)
    if cutoff is not None and user.created_at < cutoff:
        rule = (
            f'accounts older than {bonus.new_player_days} days'
            if bonus.new_player_days
            else 'accounts registered before the bonus started'
        )
        reasons.append(
            f'Bonus excludes old players ({rule}); player registered '
            f'{user.created_at:%d %b %Y}'
        )

    # Abuse: recent real-money deposit followed by play.
    if bonus.abuse_deposited_days:
        since = now - timedelta(days=bonus.abuse_deposited_days)
        deposited = Transaction.objects.filter(
            user_id=user.id, type='deposit', status='completed', created_at__gte=since
        ).exists()
        played = GameRound.objects.filter(
            user_id=user.id, created_at__gte=since
        ).exists()
        if deposited and played:
            reasons.append(
                f'Deposited and played within the last {bonus.abuse_deposited_days} days'
            )

    # Abuse: any real-money play in the window.
    if bonus.abuse_played_days:
        since = now - timedelta(days=bonus.abuse_played_days)
        if GameRound.objects.filter(user_id=user.id, created_at__gte=since).exists():
            reasons.append(
                f'Played for real money within the last {bonus.abuse_played_days} days'
            )

    return {
        'eligible': not reasons,
        'reasons': reasons,
        'player': player_label(user),
        'player_id': user.id,
        'bonus_id': bonus.id,
        'bonus_name': bonus.display_title or bonus.name,
        'amount': _f(bonus.redemption_amount or bonus.value_amount),
        'times_claimed': already,
    }


# --------------------------------------------------------------------------
# Games / Sort by Web
# --------------------------------------------------------------------------

def list_game_order(params):
    """Sort by Web: the game catalogue in display order."""
    from core.models import Game

    qs = Game.objects.select_related('provider').filter(is_active=True)
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    if (provider_id := _int(params.get('providerId'))) is not None:
        qs = qs.filter(provider_id=provider_id)

    qs = qs.order_by('sort_order', 'id')
    limit, offset = paging(params)
    return page_result(qs, limit, offset, lambda g: {
        'id': g.id,
        'name': g.name,
        'provider': g.provider.name if g.provider_id else None,
        'provider_id': g.provider_id,
        'sort_order': g.sort_order,
        'label': f'{g.name} ({g.provider.name if g.provider_id else "—"}) - {g.id}',
    })


def save_game_order(ordered_ids):
    """Persist a new display order.

    The screen submits the ids in their new order; position in the list is the
    order, so one pass rewrites every row it names.
    """
    from core.models import Game

    if not isinstance(ordered_ids, (list, tuple)):
        raise ValueError('Expected a list of game ids')
    ids = [gid for gid in (_int(g) for g in ordered_ids) if gid is not None]
    if not ids:
        raise ValueError('No game ids supplied')
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate game ids in the ordering')

    known = set(Game.objects.filter(id__in=ids).values_list('id', flat=True))
    missing = [gid for gid in ids if gid not in known]
    if missing:
        raise ValueError(f'Unknown game id(s): {missing[:5]}')

    for position, game_id in enumerate(ids):
        Game.objects.filter(id=game_id).update(sort_order=position)
    return {'ordered': len(ids)}
