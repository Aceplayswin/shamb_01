"""Money-based bonus engine.

This is the runtime that actually *awards* bonuses to players. It is deliberately
separate from ``admin_services`` (which is the CRUD/control panel side): the
functions here are the triggers wired into the register and deposit flows plus
the public claim/read endpoints.

Every award goes through :func:`_award_bonus`, which enforces the per-bonus
controls the admin configured — active window, per-user limit, total budget,
deposit sequence, player type, scope, wagering multiplier — so "fully
controllable" holds no matter how the bonus was triggered.

The money model is *pending reward*, not free credit:

  1. The player deposits; the deposit alone lands in their real balance.
  2. Claiming a bonus writes a UserBonus row with
     ``wagering_required = amount x multiplier``. Nothing is credited.
  3. The player bets their own real money. Each settled bet adds its stake to
     ``wagering_completed`` via :func:`record_wagering` — turnover is counted,
     not wins or losses.
  4. Once ``wagering_completed >= target`` the bonus flips to 'completed' and
     only then is the amount paid into the withdrawable main balance.

Targets are provider-weighted: :class:`BonusProvider` overrides the flat
multiplier per game provider, so a near-coin-flip live-casino table can demand
far more turnover than a slot before the same bonus clears.

Rows written before this model shipped carry ``award_mode='locked'``: they were
credited into ``bonus_balance`` up front and burn down ``wallet.wagering_balance``
as the player bets. They are deliberately left on that path to settle out, and
:func:`record_wagering` ignores them.
"""

import secrets
from datetime import timedelta
from decimal import Decimal

from django.db.models import F
from django.utils import timezone

from core.models import (
    Bonus, BonusProvider, Transaction, User, UserBonus, UserSetting, Wallet,
)
from tenants.state import tenant_atomic

ZERO = Decimal('0')


# --- eligibility -----------------------------------------------------------

def _is_live(bonus: Bonus, now=None) -> bool:
    """True when the bonus is active and inside its validity window."""
    now = now or timezone.now()
    if bonus.status != Bonus.Status.ACTIVE:
        return False
    if bonus.start_date and bonus.start_date > now:
        return False
    if bonus.end_date and bonus.end_date < now:
        return False
    return True


def _budget_left(bonus: Bonus) -> Decimal | None:
    """Remaining spend against ``total_budget`` (None = uncapped)."""
    if bonus.total_budget is None:
        return None
    return bonus.total_budget - (bonus.total_awarded or ZERO)


def _times_awarded(user_id: int, bonus_id: int) -> int:
    return UserBonus.objects.filter(user_id=user_id, bonus_id=bonus_id).count()


def deposit_ordinal(user_id: int) -> int:
    """Which lifetime deposit the user's latest confirmed deposit is (1-based).

    Counts completed deposit transactions. The deposit flow marks the row
    COMPLETED *before* firing the bonus engine, so during an award this returns
    the ordinal of the deposit being processed.
    """
    return Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.COMPLETED,
    ).count()


def _sequence_error(bonus: Bonus, ordinal: int | None) -> str | None:
    """Enforce the is_first/second/third_deposit gates.

    No flag set = the bonus is not sequence-restricted. Several flags set = it
    fires on any of those ordinals.
    """
    wanted = {
        n
        for n, on in ((1, bonus.is_first_deposit), (2, bonus.is_second_deposit), (3, bonus.is_third_deposit))
        if on
    }
    if not wanted:
        return None
    if ordinal is None:
        return 'This bonus is only available on a qualifying deposit.'
    if ordinal not in wanted:
        labels = {1: 'first', 2: 'second', 3: 'third'}
        which = ' or '.join(labels[n] for n in sorted(wanted))
        return f'This bonus applies only to your {which} deposit.'
    return None


def _new_player_error(bonus: Bonus, user_id: int) -> str | None:
    """Enforce is_new_player_only against the account's registration date."""
    if not bonus.is_new_player_only:
        return None
    user = User.objects.filter(id=user_id).only('created_at').first()
    if not user:
        return 'Account not found.'
    window = timedelta(days=bonus.new_player_days or 0)
    if window and timezone.now() - user.created_at > window:
        return 'This bonus is for newly registered accounts only.'
    return None


def _scope_error(bonus: Bonus, user_id: int) -> str | None:
    """A 'targeted' bonus is issued to exactly one account."""
    if bonus.scope != Bonus.Scope.TARGETED:
        return None
    if bonus.target_user_id != user_id:
        return 'This bonus is not available on your account.'
    return None


def _eligibility_error(
    bonus: Bonus, user_id: int, gross_amount: Decimal, ordinal: int | None = None
) -> str | None:
    """Return a human reason the user cannot receive ``bonus`` right now, else None."""
    if not _is_live(bonus):
        return 'This bonus is not currently active.'
    if bonus.per_user_limit is not None and _times_awarded(user_id, bonus.id) >= bonus.per_user_limit:
        return 'You have already claimed this bonus the maximum number of times.'
    left = _budget_left(bonus)
    if left is not None and left <= ZERO:
        return 'This bonus is fully subscribed.'
    return (
        _scope_error(bonus, user_id)
        or _new_player_error(bonus, user_id)
        or _sequence_error(bonus, ordinal)
    )


def _resolve_amount(bonus: Bonus, gross_amount: Decimal) -> Decimal:
    """Turn a bonus config + driving money amount into a credited amount.

    ``gross_amount`` is the deposit/loss the bonus is computed from (0 for a flat
    joining bonus). Percentage bonuses scale off it; fixed bonuses ignore it. The
    result is clamped to ``max_bonus_cap`` and the remaining budget.
    """
    if bonus.value_type == Bonus.ValueType.PERCENTAGE:
        amount = (gross_amount * bonus.value_amount) / Decimal('100')
    else:
        amount = bonus.value_amount
    if bonus.max_bonus_cap is not None:
        amount = min(amount, bonus.max_bonus_cap)
    left = _budget_left(bonus)
    if left is not None:
        amount = min(amount, max(left, ZERO))
    # Round to paise.
    return amount.quantize(Decimal('0.01'))


# --- core crediting primitive ---------------------------------------------

def _award_bonus(
    *,
    user_id: int,
    bonus: Bonus | None,
    amount: Decimal,
    source: str,
    transaction_id: int | None = None,
    granted_by: int | None = None,
    notes: str | None = None,
    wagering_multiplier: Decimal | None = None,
    credit_target: str | None = None,
    validity_days: int | None = None,
) -> UserBonus | None:
    """Record ``amount`` as a pending reward the player must wager to unlock.

    No money moves here. The bonus is stored with a wagering target and stays
    ``pending`` until :func:`record_wagering` sees enough turnover, at which
    point it is credited to the withdrawable main balance. Budget counters are
    bumped at award time so a reserved bonus cannot be double-promised.

    Returns the created ``UserBonus`` (or None if the resolved amount was not
    positive).
    """
    amount = amount.quantize(Decimal('0.01'))
    if amount <= ZERO:
        return None

    target = credit_target or (bonus.credit_target if bonus else Bonus.CreditTarget.BONUS)
    mult = wagering_multiplier if wagering_multiplier is not None else (
        bonus.wagering_multiplier if bonus else ZERO
    )
    wagering_required = (amount * mult).quantize(Decimal('0.01'))
    days = validity_days if validity_days is not None else (
        bonus.bonus_validity_days if bonus else 30
    )
    expires_at = timezone.now() + timedelta(days=days) if days else None

    with tenant_atomic():
        # Materialise the wallet so downstream reads never race a missing row,
        # but leave every balance untouched — the reward is not money yet.
        Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': 'INR'})

        user_bonus = UserBonus.objects.create(
            user_id=user_id,
            bonus=bonus,
            amount=amount,
            wagering_required=wagering_required,
            credit_target=target,
            award_mode=UserBonus.AwardMode.PENDING,
            source=source,
            # The money event that drove the award (the deposit), for auditing.
            transaction_id=transaction_id,
            granted_by=granted_by,
            notes=notes,
            status=UserBonus.Status.PENDING,
            expires_at=expires_at,
        )

        if bonus is not None:
            Bonus.objects.filter(id=bonus.id).update(
                total_awarded=F('total_awarded') + amount,
                total_claims=F('total_claims') + 1,
            )

    # A zero requirement is already satisfied — pay it out immediately rather
    # than stranding it until the player happens to place a bet.
    if wagering_required <= ZERO:
        _credit_cleared_bonus(user_bonus.id)
        user_bonus.refresh_from_db()

    return user_bonus


# --- wagering progress -----------------------------------------------------

def _effective_multiplier(bonus: Bonus | None, provider_id: int | None) -> Decimal:
    """The wagering multiplier that applies to a bet on ``provider_id``.

    A ``BonusProvider`` row for this provider overrides the bonus's flat
    multiplier — that is the risk-balancing lever (slots 15x, live casino 50x).
    Anything without an override falls back to the flat rate.
    """
    if bonus is None:
        return ZERO
    if provider_id is not None:
        rule = BonusProvider.objects.filter(
            bonus_id=bonus.id, provider_id=provider_id
        ).only('wagering_multiplier').first()
        if rule is not None:
            return rule.wagering_multiplier
    return bonus.wagering_multiplier or ZERO


def _credit_cleared_bonus(user_bonus_id: int) -> bool:
    """Pay out a bonus whose wagering target is met. Idempotent.

    Moves the reward into the withdrawable main balance and writes the
    BONUS_CREDIT transaction — the only point at which a pending bonus becomes
    real money. Returns True if this call performed the credit.
    """
    with tenant_atomic():
        ub = UserBonus.objects.select_for_update().filter(id=user_bonus_id).first()
        # Re-check under the lock: a concurrent callback may have paid it already.
        if ub is None or ub.status != UserBonus.Status.PENDING:
            return False

        Wallet.objects.filter(user_id=ub.user_id).update(
            main_balance=F('main_balance') + ub.amount
        )
        tx = Transaction.objects.create(
            user_id=ub.user_id,
            type=Transaction.TxType.BONUS_CREDIT,
            amount=ub.amount,
            status=Transaction.Status.COMPLETED,
            notes=ub.notes or (
                (ub.bonus.display_title or ub.bonus.name) if ub.bonus else 'Bonus'
            ),
        )
        ub.status = UserBonus.Status.COMPLETED
        ub.completed_at = timezone.now()
        ub.transaction_id = tx.id
        ub.save(update_fields=['status', 'completed_at', 'transaction_id', 'updated_at'])
    return True


def record_wagering(
    user_id: int, bet_amount: Decimal, provider_id: int | None = None
) -> list[int]:
    """Credit ``bet_amount`` of turnover against the player's pending bonuses.

    Called from bet settlement. Every rupee staked counts toward the target
    regardless of whether the round won or lost. When a bonus's target is
    reached it is paid straight into the withdrawable balance.

    The target is provider-weighted: a bonus with per-provider multipliers is
    judged against the multiplier for the provider this bet was placed on, per
    the wagering spec. Returns the ids of bonuses cleared by this bet.
    """
    if bet_amount is None or bet_amount <= ZERO:
        return []

    now = timezone.now()
    pending = list(
        UserBonus.objects.filter(
            user_id=user_id,
            status=UserBonus.Status.PENDING,
            award_mode=UserBonus.AwardMode.PENDING,
        ).select_related('bonus')
    )
    cleared: list[int] = []

    for ub in pending:
        # Lapsed rewards stop accruing and are closed out rather than paid.
        if ub.expires_at and ub.expires_at < now:
            UserBonus.objects.filter(
                id=ub.id, status=UserBonus.Status.PENDING
            ).update(status=UserBonus.Status.EXPIRED)
            continue

        # F() so simultaneous callbacks for the same player cannot lose turnover.
        UserBonus.objects.filter(id=ub.id).update(
            wagering_completed=F('wagering_completed') + bet_amount
        )
        completed = UserBonus.objects.values_list(
            'wagering_completed', flat=True
        ).get(id=ub.id)

        mult = _effective_multiplier(ub.bonus, provider_id)
        target = (ub.amount * mult).quantize(Decimal('0.01'))
        if completed >= target and _credit_cleared_bonus(ub.id):
            cleared.append(ub.id)

    return cleared


def _first_active_bonus(bonus_type: str) -> Bonus | None:
    """The live, most-recently-created bonus of a type — the one the engine fires."""
    return next(
        (
            b
            for b in Bonus.objects.filter(bonus_type=bonus_type).order_by('-created_at')
            if _is_live(b)
        ),
        None,
    )


# --- trigger: joining / welcome -------------------------------------------

def award_joining_bonus(user_id: int) -> UserBonus | None:
    """Fire the active joining bonus for a freshly registered player (if any)."""
    bonus = _first_active_bonus(Bonus.Type.JOINING)
    if not bonus or bonus.claim_method != Bonus.ClaimMethod.AUTO:
        return None
    if _eligibility_error(bonus, user_id, ZERO):
        return None
    amount = _resolve_amount(bonus, ZERO)
    return _award_bonus(user_id=user_id, bonus=bonus, amount=amount, source=UserBonus.Source.JOINING)


# --- trigger: deposit match ------------------------------------------------

def award_deposit_bonus(user_id: int, deposit_amount: Decimal, transaction_id: int) -> UserBonus | None:
    """Fire the active deposit-match bonus when a deposit is confirmed."""
    bonus = _first_active_bonus(Bonus.Type.DEPOSIT)
    if not bonus or bonus.claim_method != Bonus.ClaimMethod.AUTO:
        return None
    if deposit_amount < (bonus.min_deposit or ZERO):
        return None
    # The deposit row is already COMPLETED by the time we run, so this counts
    # the deposit currently being confirmed.
    if _eligibility_error(bonus, user_id, deposit_amount, ordinal=deposit_ordinal(user_id)):
        return None
    amount = _resolve_amount(bonus, deposit_amount)
    return _award_bonus(
        user_id=user_id,
        bonus=bonus,
        amount=amount,
        source=UserBonus.Source.DEPOSIT,
        transaction_id=transaction_id,
    )


# --- trigger: referral -----------------------------------------------------

def award_referral_bonus(referred_user_id: int, event: str, deposit_amount: Decimal = ZERO) -> UserBonus | None:
    """Pay the referrer when a user they referred hits the configured milestone.

    ``event`` is 'register' or 'deposit'. A referral bonus with ``min_deposit`` > 0
    pays on the referred user's first qualifying deposit; otherwise on signup.
    Pays ``referrer_reward`` to the referrer; if ``value_amount`` > 0 the referred
    user also gets that as a welcome kicker.
    """
    setting = UserSetting.objects.filter(user_id=referred_user_id).first()
    if not setting or not setting.referred_by:
        return None
    bonus = _first_active_bonus(Bonus.Type.REFERRAL)
    if not bonus:
        return None

    needs_deposit = (bonus.min_deposit or ZERO) > ZERO
    if needs_deposit and event != 'deposit':
        return None
    if not needs_deposit and event != 'register':
        return None
    if needs_deposit and deposit_amount < bonus.min_deposit:
        return None

    referrer_id = setting.referred_by
    # Only pay once per referred user.
    # Delimited marker so the "already paid" check is an exact match — a bare
    # "#4" would substring-match "#42".
    ref_marker = f'[ref:{referred_user_id}]'
    # Pay a given referred user's referral bonus exactly once. Both the referrer
    # payout and the referee kicker carry the same marker, so this holds even
    # when only one of the two has a non-zero amount.
    already = UserBonus.objects.filter(
        source=UserBonus.Source.REFERRAL,
        notes__contains=ref_marker,
    ).exists()
    if already:
        return None
    if _eligibility_error(bonus, referrer_id, deposit_amount):
        return None

    reward = (bonus.referrer_reward or ZERO)
    if bonus.max_bonus_cap is not None:
        reward = min(reward, bonus.max_bonus_cap)
    awarded = _award_bonus(
        user_id=referrer_id,
        bonus=bonus,
        amount=reward,
        source=UserBonus.Source.REFERRAL,
        notes=f'Referral reward for referred user {ref_marker}',
    )
    # Optional kicker for the referred player.
    if bonus.value_amount and bonus.value_type == Bonus.ValueType.FIXED and bonus.value_amount > ZERO:
        _award_bonus(
            user_id=referred_user_id,
            bonus=bonus,
            amount=bonus.value_amount,
            source=UserBonus.Source.REFERRAL,
            notes=f'Welcome referral bonus {ref_marker} (referred by #{referrer_id})',
        )
    return awarded


# --- referral codes --------------------------------------------------------

def ensure_referral_code(user_id: int) -> str:
    """Return the player's shareable referral code, generating one on first use."""
    setting = UserSetting.objects.filter(user_id=user_id).first()
    if setting and setting.referral_code:
        return setting.referral_code
    code = _generate_referral_code()
    if setting:
        setting.referral_code = code
        setting.save(update_fields=['referral_code', 'updated_at'])
    return code


def _generate_referral_code() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(10):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        if not UserSetting.objects.filter(referral_code=code).exists():
            return code
    return ''.join(secrets.choice(alphabet) for _ in range(10))


def resolve_referrer(referral_code: str | None) -> int | None:
    """Map a referral code entered at signup to the referrer's user id."""
    if not referral_code:
        return None
    setting = UserSetting.objects.filter(
        referral_code=referral_code.strip().upper()
    ).first()
    return setting.user_id if setting else None


# --- promo-code claim (public) --------------------------------------------

def claim_promo_code(user_id: int, code: str, deposit_amount: Decimal = ZERO) -> dict:
    """Public: a player redeems a promo code for its bonus."""
    if not code:
        raise ValueError('Enter a promo code.')
    bonus = Bonus.objects.filter(promo_code=code.strip().upper()).first()
    if not bonus:
        raise ValueError('Invalid promo code.')
    reason = _eligibility_error(
        bonus, user_id, deposit_amount, ordinal=deposit_ordinal(user_id)
    )
    if reason:
        raise ValueError(reason)
    amount = _resolve_amount(bonus, deposit_amount)
    if amount <= ZERO:
        raise ValueError('This code has no reward available right now.')
    awarded = _award_bonus(
        user_id=user_id,
        bonus=bonus,
        amount=amount,
        source=UserBonus.Source.PROMO,
        notes=f'Promo code {code.strip().upper()}',
    )
    return {
        'claimed': True,
        'amount': float(awarded.amount) if awarded else 0,
        'title': bonus.display_title or bonus.name,
    }


# --- read models -----------------------------------------------------------

def list_public_bonuses() -> list[dict]:
    """Active, promotable bonuses for the public promotions page."""
    now = timezone.now()
    out = []
    for b in Bonus.objects.filter(status=Bonus.Status.ACTIVE).order_by('-created_at'):
        if not _is_live(b, now):
            continue
        out.append({
            'id': b.id,
            'title': b.display_title or b.name,
            'description': b.description,
            'bonus_type': b.bonus_type,
            'value_type': b.value_type,
            'value_amount': float(b.value_amount),
            'min_deposit': float(b.min_deposit),
            'max_bonus_cap': float(b.max_bonus_cap) if b.max_bonus_cap is not None else None,
            'wagering_multiplier': float(b.wagering_multiplier),
            'claim_method': b.claim_method,
            'has_promo_code': bool(b.promo_code),
        })
    return out


def list_user_bonuses(user_id: int) -> list[dict]:
    """A player's own awarded bonuses + wagering progress."""
    rows = UserBonus.objects.filter(user_id=user_id).select_related('bonus').order_by('-created_at')
    out = []
    for ub in rows:
        required = ub.wagering_required or ZERO
        remaining = max(required - ub.wagering_completed, ZERO)
        out.append({
            'id': ub.id,
            'title': (ub.bonus.display_title or ub.bonus.name) if ub.bonus else (ub.notes or 'Bonus'),
            'amount': float(ub.amount),
            'source': ub.source,
            'status': ub.status,
            'wagering_required': float(required),
            'wagering_completed': float(ub.wagering_completed),
            'wagering_remaining': float(remaining),
            # Progress bar for the bonus page.
            'progress_percent': (
                float(min(ub.wagering_completed / required, Decimal('1')) * 100)
                if required > ZERO else 100.0
            ),
            # True while the reward is owed but not yet spendable.
            'is_pending': ub.status == UserBonus.Status.PENDING,
            'credit_target': ub.credit_target,
            'expires_at': ub.expires_at.isoformat() if ub.expires_at else None,
            'completed_at': ub.completed_at.isoformat() if ub.completed_at else None,
            'created_at': ub.created_at.isoformat(),
        })
    return out
