"""The commission engine.

Runs once a day (or on demand from the admin console) and turns yesterday's
player activity into ledger entries. Three kinds of money come out of it:

* **revenue share** — a percentage of the net gaming revenue the affiliate's
  referred players generated;
* **CPA** — a one-off bounty when a referred player makes a qualifying first
  deposit;
* **override** — a parent affiliate's cut of what their sub-affiliates earned.

Two decisions here matter more than the rest:

**NGR comes from ``game_rounds``, not ``bets``.** The ``bets`` table has a single
writer, the legacy ``services.place_bet``, and the live aggregator flow never
touches it. An engine reading ``bets`` computes zero forever while appearing to
work perfectly, which is the worst possible failure mode for money.

**Idempotency is enforced by the database.** Every entry carries a computed
``dedupe_key`` under a unique constraint. Re-running a period updates entries
that are still pending and refuses to touch anything already approved or paid,
so a re-run after fixing a rate corrects the future without rewriting history.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from core.affiliate_models import (Affiliate, AffiliateApiNonce, AffiliateClick,
                                   AffiliateCommissionLedger,
                                   AffiliateCommissionRun, AffiliateFraudFlag,
                                   AffiliateReferral)
from core.affiliate_services import (ZERO, get_program_settings, money,
                                     commission_rate_for, cpa_amount_for,
                                     override_rate_for, notify, inr)
from core.models import GameRound, UserBonus
from tenants.state import tenant_atomic

logger = logging.getLogger('affiliate')


def _day_bounds(day: date):
    """Half-open datetime bounds for one calendar day."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(
        timezone.datetime.combine(day, timezone.datetime.min.time()), tz
    )
    return start, start + timedelta(days=1)


def _dedupe_key(entry_type: str, period: date, referral_id=None,
                source_affiliate_id=None) -> str:
    """The idempotency key.

    Deterministic from what the entry is *about*, so recomputing the same day
    produces the same key and lands on the existing row rather than a new one.
    """
    return (f'{entry_type}:{period:%Y%m%d}:{referral_id or 0}:'
            f'{source_affiliate_id or 0}')


def _write_entry(*, affiliate_id, entry_type, base_kind, base_amount, rate, amount,
                 period, referral_id=None, source_affiliate_id=None, run_id=None,
                 currency='INR', dry_run=False) -> str:
    """Insert or update one ledger entry. Returns 'written', 'skipped' or 'noop'.

    The three-way branch is the whole safety story:

    * no row yet          -> insert as pending;
    * row still pending   -> update it, so a corrected rate takes effect;
    * row approved/paid   -> leave it completely alone.

    That last case is what makes re-running safe on a live ledger: money that
    has already cleared review can never be silently rewritten underneath it.
    """
    amount = money(amount)
    if amount <= ZERO:
        return 'noop'

    key = _dedupe_key(entry_type, period, referral_id, source_affiliate_id)
    if dry_run:
        return 'written'

    with tenant_atomic():
        existing = AffiliateCommissionLedger.objects.select_for_update().filter(
            affiliate_id=affiliate_id, dedupe_key=key
        ).first()

        if existing is None:
            AffiliateCommissionLedger.objects.create(
                affiliate_id=affiliate_id,
                referral_id=referral_id,
                source_affiliate_id=source_affiliate_id,
                entry_type=entry_type,
                base_kind=base_kind,
                base_amount=money(base_amount),
                rate=money(rate),
                amount=amount,
                currency=currency,
                status=AffiliateCommissionLedger.Status.PENDING,
                period_start=period,
                period_end=period,
                dedupe_key=key,
                run_id=run_id,
            )
            return 'written'

        if existing.status == AffiliateCommissionLedger.Status.PENDING:
            existing.base_amount = money(base_amount)
            existing.rate = money(rate)
            existing.amount = amount
            existing.run_id = run_id
            existing.save(update_fields=['base_amount', 'rate', 'amount', 'run_id',
                                         'updated_at'])
            return 'written'

        return 'skipped'


def _player_ngr(user_id: int, start, end, deduct_bonus: bool) -> Decimal:
    """Net gaming revenue for one player over one day.

    Only settled rounds count. A stake on a delayed-settlement vertical (sports,
    lottery) has no result yet, so treating it as revenue would pay commission
    on money that might still be paid back out. It is picked up on the day it
    settles instead, which is both correct and self-healing.
    """
    agg = GameRound.objects.filter(
        user_id=user_id,
        settle_status=GameRound.SettleStatus.SETTLED,
        created_at__gte=start,
        created_at__lt=end,
    ).aggregate(stake=Sum('bet_amount'), win=Sum('win_amount'))

    ggr = money(agg['stake'] or 0) - money(agg['win'] or 0)
    if not deduct_bonus:
        return ggr

    # Bonus money is a marketing cost the product bore, not revenue it earned,
    # so the standard NGR definition nets it off before commission is taken.
    bonus = UserBonus.objects.filter(
        user_id=user_id, created_at__gte=start, created_at__lt=end
    ).aggregate(total=Sum('amount'))['total'] or 0
    return ggr - money(bonus)


def _process_revenue_share(affiliate, referrals, period, start, end, settings,
                           run_id, dry_run) -> tuple[int, int, Decimal]:
    """Revenue share for one affiliate for one day."""
    written = skipped = 0
    total = ZERO

    if affiliate.commission_type == Affiliate.CommissionType.CPA:
        # Pure-CPA affiliates earn per acquisition only.
        return written, skipped, total

    day_ngr = ZERO
    per_referral = {}
    for referral in referrals:
        ngr = _player_ngr(referral.user_id, start, end,
                          bool(settings.get('deduct_bonus_from_ngr')))
        if ngr:
            per_referral[referral.id] = ngr
            day_ngr += ngr

    if not per_referral:
        return written, skipped, total

    carry = money(affiliate.ngr_carry_forward)
    effective = day_ngr - carry

    if effective <= ZERO:
        # A losing day. Carry the shortfall so tomorrow's revenue nets it off
        # first — the industry norm, and the alternative (paying commission on
        # a day the product lost money, then again when it recovers) is worse.
        if settings.get('negative_ngr_carry_forward'):
            if not dry_run:
                Affiliate.objects.filter(id=affiliate.id).update(
                    ngr_carry_forward=-effective
                )
            logger.info('affiliate %s day %s negative NGR, carrying %s',
                        affiliate.id, period, -effective)
        return written, skipped, total

    if not dry_run:
        Affiliate.objects.filter(id=affiliate.id).update(ngr_carry_forward=ZERO)

    rate = commission_rate_for(affiliate, settings)
    # Split per referral so the ledger stays attributable to a player, then
    # scale by the affiliate-level effective NGR so a carried loss is honoured.
    scale = effective / day_ngr if day_ngr else ZERO
    for referral_id, ngr in per_referral.items():
        base = money(ngr * scale)
        amount = money(base * rate / 100)
        result = _write_entry(
            affiliate_id=affiliate.id,
            entry_type=AffiliateCommissionLedger.EntryType.REVENUE_SHARE,
            base_kind=AffiliateCommissionLedger.BaseKind.NGR,
            base_amount=base, rate=rate, amount=amount, period=period,
            referral_id=referral_id, run_id=run_id,
            currency=affiliate.currency or 'INR', dry_run=dry_run,
        )
        if result == 'written':
            written += 1
            total += amount
            if not dry_run:
                AffiliateReferral.objects.filter(id=referral_id).update(
                    lifetime_ngr=F('lifetime_ngr') + base,
                    lifetime_commission=F('lifetime_commission') + amount,
                )
        elif result == 'skipped':
            skipped += 1
    return written, skipped, total


def _process_cpa(affiliate, referrals, period, start, end, settings, run_id,
                 dry_run) -> tuple[int, int, Decimal]:
    """One-off acquisition bounties for first deposits made on this day."""
    written = skipped = 0
    total = ZERO

    if affiliate.commission_type == Affiliate.CommissionType.REVENUE_SHARE:
        return written, skipped, total

    min_deposit = money(settings.get('cpa_min_deposit') or 0)
    bounty = cpa_amount_for(affiliate, settings)
    hybrid_days = int(affiliate.hybrid_cpa_days
                      or settings.get('default_hybrid_cpa_days') or 0)

    for referral in referrals:
        if referral.cpa_paid or not referral.first_deposit_at:
            continue
        if not (start <= referral.first_deposit_at < end):
            continue
        if money(referral.first_deposit_amount) < min_deposit:
            continue
        # Hybrid bounds how *late* a first deposit can still earn the bounty;
        # revenue share continues regardless.
        if (affiliate.commission_type == Affiliate.CommissionType.HYBRID
                and hybrid_days and referral.attributed_at):
            age = (referral.first_deposit_at - referral.attributed_at).days
            if age > hybrid_days:
                continue

        result = _write_entry(
            affiliate_id=affiliate.id,
            entry_type=AffiliateCommissionLedger.EntryType.CPA,
            base_kind=AffiliateCommissionLedger.BaseKind.FTD,
            base_amount=referral.first_deposit_amount, rate=ZERO, amount=bounty,
            period=period, referral_id=referral.id, run_id=run_id,
            currency=affiliate.currency or 'INR', dry_run=dry_run,
        )
        if result == 'written':
            written += 1
            total += bounty
            if not dry_run:
                # Belt and braces with the dedupe key: even a changed key
                # (different period after a backfill) cannot pay twice.
                AffiliateReferral.objects.filter(id=referral.id).update(
                    cpa_paid=True,
                    lifetime_commission=F('lifetime_commission') + bounty,
                )
        elif result == 'skipped':
            skipped += 1
    return written, skipped, total


def _process_overrides(period, settings, run_id, dry_run) -> tuple[int, int, Decimal]:
    """Parent cuts, computed after every direct entry for the day exists.

    Two rules keep this from inventing money:

    * the base sums only ``revenue_share`` and ``cpa`` entries, never other
      overrides — otherwise a deep chain compounds a percentage of a percentage
      and mints currency out of nothing;
    * the walk carries a ``visited`` set and a depth cap, because
      ``parent_affiliate_id`` has no foreign key and a bad edit can produce a
      cycle that would otherwise loop forever.
    """
    written = skipped = 0
    total = ZERO
    max_depth = int(settings.get('max_override_depth') or 3)

    # Deepest first, so a sub's own override is already on the ledger before its
    # parent's is computed — though the base excludes overrides anyway.
    earners = list(
        Affiliate.objects.filter(
            parent_id__isnull=False, status=Affiliate.Status.APPROVED
        ).order_by('-commission_tier')
    )

    for affiliate in earners:
        visited = {affiliate.id}
        current = affiliate
        depth = 0

        while current.parent_id and depth < max_depth:
            if current.parent_id in visited:
                logger.warning('affiliate parent cycle detected at %s, stopping walk',
                               current.id)
                break
            parent = Affiliate.objects.filter(
                id=current.parent_id, status=Affiliate.Status.APPROVED, is_active=True
            ).first()
            if not parent:
                break

            base = AffiliateCommissionLedger.objects.filter(
                affiliate_id=current.id,
                period_start=period,
                entry_type__in=[
                    AffiliateCommissionLedger.EntryType.REVENUE_SHARE,
                    AffiliateCommissionLedger.EntryType.CPA,
                ],
            ).exclude(
                status=AffiliateCommissionLedger.Status.CLAWED_BACK
            ).aggregate(total=Sum('amount'))['total'] or ZERO
            base = money(base)

            if base > ZERO:
                rate = override_rate_for(current, settings)
                amount = money(base * rate / 100)
                result = _write_entry(
                    affiliate_id=parent.id,
                    entry_type=AffiliateCommissionLedger.EntryType.OVERRIDE,
                    base_kind=AffiliateCommissionLedger.BaseKind.NETWORK_COMMISSION,
                    base_amount=base, rate=rate, amount=amount, period=period,
                    source_affiliate_id=current.id, run_id=run_id,
                    currency=parent.currency or 'INR', dry_run=dry_run,
                )
                if result == 'written':
                    written += 1
                    total += amount
                elif result == 'skipped':
                    skipped += 1

            visited.add(parent.id)
            current = parent
            depth += 1

    return written, skipped, total


def auto_approve(settings: dict | None = None, dry_run: bool = False) -> int:
    """Promote aged pending entries to approved.

    Gated on the referral having no open fraud flag. Without that gate, the
    delay would auto-approve exactly the commission a human was meant to look
    at — which would make the fraud flags decorative.
    """
    settings = settings or get_program_settings()
    days = int(settings.get('auto_approve_days') or 0)
    if days <= 0:
        return 0

    cutoff = timezone.now().date() - timedelta(days=days)
    candidates = AffiliateCommissionLedger.objects.filter(
        status=AffiliateCommissionLedger.Status.PENDING,
        period_end__lte=cutoff,
    )

    flagged_referrals = set(
        AffiliateFraudFlag.objects.filter(
            status=AffiliateFraudFlag.Status.OPEN, referral_id__isnull=False
        ).values_list('referral_id', flat=True)
    )
    flagged_affiliates = set(
        AffiliateFraudFlag.objects.filter(
            status=AffiliateFraudFlag.Status.OPEN,
            risk_level__in=[AffiliateFraudFlag.RiskLevel.HIGH,
                            AffiliateFraudFlag.RiskLevel.CRITICAL],
        ).values_list('affiliate_id', flat=True)
    )

    approvable = [
        entry.id for entry in candidates
        if entry.referral_id not in flagged_referrals
        and entry.affiliate_id not in flagged_affiliates
    ]
    if not approvable or dry_run:
        return len(approvable)

    now = timezone.now()
    updated = 0
    # Chunked so a large backlog does not build one enormous IN clause.
    for i in range(0, len(approvable), 500):
        chunk = approvable[i:i + 500]
        updated += AffiliateCommissionLedger.objects.filter(
            id__in=chunk, status=AffiliateCommissionLedger.Status.PENDING
        ).update(status=AffiliateCommissionLedger.Status.APPROVED, approved_at=now)
    return updated


def refresh_commission_caches() -> None:
    """Recompute the per-affiliate display totals from the ledger.

    Derived values, rebuilt rather than incremented, so a clawback or a manual
    correction cannot leave the dashboard disagreeing with the ledger.
    """
    totals = AffiliateCommissionLedger.objects.values('affiliate_id', 'status').annotate(
        total=Sum('amount')
    )
    by_affiliate = {}
    for row in totals:
        bucket = by_affiliate.setdefault(
            row['affiliate_id'], {'pending': ZERO, 'approved': ZERO, 'paid': ZERO}
        )
        if row['status'] in bucket:
            bucket[row['status']] = money(row['total'] or 0)

    for affiliate_id, bucket in by_affiliate.items():
        Affiliate.objects.filter(id=affiliate_id).update(
            pending_commission=bucket['pending'],
            approved_commission=bucket['approved'],
            paid_commission=bucket['paid'],
            total_commission=bucket['pending'] + bucket['approved'] + bucket['paid'],
        )


def run_for_day(day: date, settings: dict, run_id=None, dry_run: bool = False) -> dict:
    """Compute every affiliate's commission for one day."""
    start, end = _day_bounds(day)
    written = skipped = 0
    total = ZERO

    affiliates = Affiliate.objects.filter(
        status=Affiliate.Status.APPROVED, is_active=True
    )
    for affiliate in affiliates:
        referrals = list(
            AffiliateReferral.objects.filter(affiliate_id=affiliate.id)
            .exclude(status=AffiliateReferral.Status.BLOCKED)
        )
        if not referrals:
            continue

        w, s, amount = _process_revenue_share(affiliate, referrals, day, start, end,
                                              settings, run_id, dry_run)
        written += w
        skipped += s
        total += amount

        w, s, amount = _process_cpa(affiliate, referrals, day, start, end, settings,
                                    run_id, dry_run)
        written += w
        skipped += s
        total += amount

    # Overrides last: they read the direct entries written above.
    w, s, amount = _process_overrides(day, settings, run_id, dry_run)
    written += w
    skipped += s
    total += amount

    return {'written': written, 'skipped': skipped, 'total': total}


def run_commissions(period_start: date | None = None, period_end: date | None = None,
                    *, trigger_source='cron', triggered_by=None, dry_run=False,
                    skip_approve=False) -> dict:
    """Run the engine over a date range, one day at a time.

    Each day is committed before the next begins, so a failure partway through a
    backfill leaves the earlier days correct rather than rolling everything back.
    """
    settings = get_program_settings()
    today = timezone.now().date()
    start = period_start or (today - timedelta(days=1))
    end = period_end or start
    if start > end:
        start, end = end, start

    run = None
    if not dry_run:
        run = AffiliateCommissionRun.objects.create(
            period_start=start, period_end=end,
            status=AffiliateCommissionRun.Status.RUNNING,
            trigger_source=trigger_source, triggered_by=triggered_by,
        )

    written = skipped = approved = 0
    total = ZERO
    try:
        day = start
        while day <= end:
            result = run_for_day(day, settings, run_id=run.id if run else None,
                                 dry_run=dry_run)
            written += result['written']
            skipped += result['skipped']
            total += result['total']
            logger.info('affiliate commissions %s: %s written, %s skipped, %s',
                        day, result['written'], result['skipped'], result['total'])
            day += timedelta(days=1)

        if not skip_approve:
            approved = auto_approve(settings, dry_run=dry_run)
        if not dry_run:
            refresh_commission_caches()
            _notify_new_commission(start, end, run.id if run else None)
    except Exception as exc:
        if run:
            run.status = AffiliateCommissionRun.Status.FAILED
            run.error = str(exc)[:2000]
            run.finished_at = timezone.now()
            run.save(update_fields=['status', 'error', 'finished_at'])
        logger.exception('affiliate commission run failed')
        raise

    if run:
        run.status = AffiliateCommissionRun.Status.COMPLETED
        run.entries_written = written
        run.entries_skipped = skipped
        run.entries_approved = approved
        run.total_amount = total
        run.finished_at = timezone.now()
        run.save(update_fields=['status', 'entries_written', 'entries_skipped',
                                'entries_approved', 'total_amount', 'finished_at'])

    return {
        'id': run.id if run else None,
        'period_start': start.isoformat(),
        'period_end': end.isoformat(),
        'entries_written': written,
        'entries_skipped': skipped,
        'entries_approved': approved,
        'total_amount': float(total),
        'dry_run': dry_run,
        'status': 'completed',
    }


def _notify_new_commission(start: date, end: date, run_id) -> None:
    """One summary notification per affiliate, not one per ledger row."""
    if not run_id:
        return
    rows = AffiliateCommissionLedger.objects.filter(run_id=run_id).values(
        'affiliate_id'
    ).annotate(total=Sum('amount'), n=Count('id'))
    for row in rows:
        if not row['total']:
            continue
        notify(row['affiliate_id'], 'commission', 'Commission calculated',
               f'{row["n"]} new entries totalling {inr(row["total"])} '
               f'for {start.isoformat()}.',
               {'run_id': run_id, 'amount': float(row['total'])})


def purge_old_rows(settings: dict | None = None) -> dict:
    """Housekeeping.

    Clicks are the highest-volume table in the program and would become the
    largest in the database inside a year without this. Nonces are only useful
    inside the signature skew window, so anything older is dead weight.
    """
    from core.affiliate_auth import SIGNATURE_MAX_SKEW_SECONDS

    settings = settings or get_program_settings()
    retention = int(settings.get('click_retention_days') or 180)
    click_cutoff = timezone.now() - timedelta(days=retention)
    # Converted clicks are evidence for an attribution and are kept regardless.
    clicks_deleted, _ = AffiliateClick.objects.filter(
        created_at__lt=click_cutoff, converted=False
    ).delete()

    nonce_cutoff = timezone.now() - timedelta(seconds=SIGNATURE_MAX_SKEW_SECONDS * 2)
    nonces_deleted, _ = AffiliateApiNonce.objects.filter(
        created_at__lt=nonce_cutoff
    ).delete()

    return {'clicks_deleted': clicks_deleted, 'nonces_deleted': nonces_deleted}
