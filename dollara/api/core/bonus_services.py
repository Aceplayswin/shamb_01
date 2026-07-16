"""Money-based bonus engine.

This is the runtime that actually *awards* bonuses to players. It is deliberately
separate from ``admin_services`` (which is the CRUD/control panel side): the
functions here are the triggers wired into the register and deposit flows plus
the public claim/read endpoints.

Every award goes through :func:`_award_bonus`, which enforces the per-bonus
controls the admin configured — active window, per-user limit, total budget,
credit target, wagering multiplier — so "fully controllable" holds no matter how
the bonus was triggered.
"""

import secrets
from datetime import timedelta
from decimal import Decimal

from django.db.models import F
from django.utils import timezone

from core.models import Bonus, Transaction, User, UserBonus, UserSetting, Wallet
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


def _eligibility_error(bonus: Bonus, user_id: int, gross_amount: Decimal) -> str | None:
    """Return a human reason the user cannot receive ``bonus`` right now, else None."""
    if not _is_live(bonus):
        return 'This bonus is not currently active.'
    if bonus.per_user_limit is not None and _times_awarded(user_id, bonus.id) >= bonus.per_user_limit:
        return 'You have already claimed this bonus the maximum number of times.'
    left = _budget_left(bonus)
    if left is not None and left <= ZERO:
        return 'This bonus is fully subscribed.'
    return None


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
    """Credit ``amount`` to the player and write the ledger + wallet transaction.

    Lands the money in the locked bonus balance or the withdrawable main balance
    per ``credit_target``, records the wagering requirement, and bumps the
    bonus's budget counters. Returns the created ``UserBonus`` (or None if the
    resolved amount was not positive).
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
        wallet, _ = Wallet.objects.select_for_update().get_or_create(
            user_id=user_id, defaults={'currency': 'INR'}
        )
        if target == Bonus.CreditTarget.MAIN:
            Wallet.objects.filter(user_id=user_id).update(
                main_balance=F('main_balance') + amount
            )
        else:
            Wallet.objects.filter(user_id=user_id).update(
                bonus_balance=F('bonus_balance') + amount,
                wagering_balance=F('wagering_balance') + wagering_required,
            )

        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.BONUS_CREDIT,
            amount=amount,
            status=Transaction.Status.COMPLETED,
            notes=notes or (bonus.display_title or bonus.name if bonus else 'Bonus'),
        )

        user_bonus = UserBonus.objects.create(
            user_id=user_id,
            bonus=bonus,
            amount=amount,
            wagering_required=wagering_required,
            credit_target=target,
            source=source,
            transaction_id=tx.id,
            granted_by=granted_by,
            notes=notes,
            status=UserBonus.Status.ACTIVE,
            expires_at=expires_at,
        )

        if bonus is not None:
            Bonus.objects.filter(id=bonus.id).update(
                total_awarded=F('total_awarded') + amount,
                total_claims=F('total_claims') + 1,
            )

    return user_bonus


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
    if _eligibility_error(bonus, user_id, deposit_amount):
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
    reason = _eligibility_error(bonus, user_id, deposit_amount)
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
    return [
        {
            'id': ub.id,
            'title': (ub.bonus.display_title or ub.bonus.name) if ub.bonus else (ub.notes or 'Bonus'),
            'amount': float(ub.amount),
            'source': ub.source,
            'status': ub.status,
            'wagering_required': float(ub.wagering_required),
            'wagering_completed': float(ub.wagering_completed),
            'credit_target': ub.credit_target,
            'expires_at': ub.expires_at.isoformat() if ub.expires_at else None,
            'created_at': ub.created_at.isoformat(),
        }
        for ub in rows
    ]
