"""Staff-facing logic for the affiliate program.

The console side of everything in :mod:`core.affiliate_services`: approving
applications, setting commission terms, reviewing KYC, releasing payouts, and
looking at fraud signals. Split from the portal module along the trust
boundary — nothing here is reachable with an affiliate token, and nothing in
the portal module can change a rate or a status.

Every state change writes an ``affiliate_audit_logs`` row naming the staff
member, because these are decisions about other people's money.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from core import affiliate_commission
from core.affiliate_models import (Affiliate, AffiliateApiKey, AffiliateAuditLog,
                                   AffiliateClick, AffiliateCommissionLedger,
                                   AffiliateCommissionRun, AffiliateFraudFlag,
                                   AffiliateKycDocument, AffiliateLink,
                                   AffiliatePayout, AffiliatePayoutMethod,
                                   AffiliateReferral, AffiliateSupportTicket)
from core.affiliate_services import (ZERO, _iso, audit, f, get_program_settings,
                                     inr, money, notify, save_program_settings,
                                     serialize_affiliate, serialize_api_key,
                                     serialize_kyc_document,
                                     serialize_ledger_entry, serialize_payout,
                                     serialize_payout_method, serialize_referral,
                                     commission_rate_for, cpa_amount_for,
                                     override_rate_for)
from core.models import User
from tenants.state import tenant_atomic

logger = logging.getLogger('affiliate')


def _actor_label(admin_id) -> str:
    if not admin_id:
        return 'system'
    row = User.objects.filter(id=admin_id).values('username', 'full_name').first()
    if not row:
        return f'admin:{admin_id}'
    return row['username'] or row['full_name'] or f'admin:{admin_id}'


def _staff_audit(affiliate_id, admin_id, action, **kwargs):
    audit(affiliate_id, AffiliateAuditLog.ActorType.STAFF, action,
          actor_id=admin_id, actor_label=_actor_label(admin_id), **kwargs)


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

def _serialize_application(affiliate: Affiliate) -> dict:
    return {
        'id': affiliate.id,
        'code': affiliate.code,
        'name': affiliate.name,
        'email': affiliate.email,
        'phone': affiliate.phone,
        'company': affiliate.company_name or 'Individual',
        'traffic_source': affiliate.traffic_source,
        'expected_volume': affiliate.expected_volume,
        'payment_preference': affiliate.payment_preference,
        'notes': affiliate.application_notes,
        'status': affiliate.status,
        'rejection_reason': affiliate.rejection_reason,
        'parent_affiliate_id': affiliate.parent_id,
        'parent_name': affiliate.parent.name if affiliate.parent else None,
        'proposed_override_rate': f(affiliate.override_rate),
        'applied_at': _iso(affiliate.applied_at or affiliate.created_at),
    }


def list_applications(*, status=None, limit=50, offset=0) -> dict:
    qs = Affiliate.objects.select_related('parent')
    if status and status != 'all':
        qs = qs.filter(status=status)
    else:
        # The queue is about decisions still to be made; approved partners live
        # on the affiliate list instead.
        qs = qs.filter(status__in=[Affiliate.Status.PENDING,
                                   Affiliate.Status.INFO_REQUESTED,
                                   Affiliate.Status.REJECTED])
    total = qs.count()
    rows = qs.order_by('-applied_at', '-created_at')[offset:offset + limit]
    return {
        'records': [_serialize_application(a) for a in rows],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'pending': Affiliate.objects.filter(status=Affiliate.Status.PENDING).count(),
            'info_requested': Affiliate.objects.filter(
                status=Affiliate.Status.INFO_REQUESTED).count(),
        },
    }


def approve_application(affiliate_id: int, admin_id: int, payload: dict) -> dict:
    """Approve an application and set its commercial terms.

    Terms are set here rather than at apply time because this is the moment
    staff actually decide them; before approval an application carries only what
    the applicant proposed.
    """
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')
    if affiliate.status == Affiliate.Status.APPROVED:
        raise ValueError('This affiliate is already approved.')

    settings = get_program_settings()
    before = {'status': affiliate.status}

    commission_type = payload.get('commissionType') or settings['default_commission_type']
    if commission_type not in dict(Affiliate.CommissionType.choices):
        raise ValueError('Choose a valid commission type.')

    with tenant_atomic():
        affiliate.status = Affiliate.Status.APPROVED
        affiliate.is_active = True
        affiliate.commission_type = commission_type
        if payload.get('commissionRate') is not None:
            affiliate.commission_rate = money(payload['commissionRate'])
        if payload.get('cpaAmount') is not None:
            affiliate.cpa_amount = money(payload['cpaAmount'])
        if payload.get('overrideRate') is not None:
            affiliate.override_rate = money(payload['overrideRate'])
        if payload.get('hybridCpaDays') is not None:
            affiliate.hybrid_cpa_days = int(payload['hybridCpaDays'] or 0)
        if payload.get('tierLabel'):
            affiliate.tier_label = str(payload['tierLabel'])[:20]
        if payload.get('payoutThreshold') is not None:
            affiliate.payout_threshold = money(payload['payoutThreshold'])
        affiliate.approved_at = timezone.now()
        affiliate.approved_by = admin_id
        affiliate.rejection_reason = None
        affiliate.save()

    _staff_audit(affiliate.id, admin_id, 'application.approved',
                 target=f'affiliate:{affiliate.code}', before=before,
                 after={'commission_type': commission_type,
                        'commission_rate': f(affiliate.commission_rate)})
    notify(affiliate.id, 'account', 'Application approved',
           'Your affiliate account is live. Sign in to finish onboarding and get '
           'your tracking link.')
    return serialize_affiliate(affiliate, settings)


def reject_application(affiliate_id: int, admin_id: int, reason: str) -> dict:
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')
    reason = (reason or '').strip()
    if not reason:
        raise ValueError('Give a reason — the applicant is shown this.')

    before = {'status': affiliate.status}
    affiliate.status = Affiliate.Status.REJECTED
    affiliate.rejection_reason = reason[:500]
    affiliate.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    _staff_audit(affiliate.id, admin_id, 'application.rejected',
                 target=f'affiliate:{affiliate.code}', before=before,
                 after={'reason': reason})
    notify(affiliate.id, 'account', 'Application not approved', reason)
    return _serialize_application(affiliate)


def request_application_info(affiliate_id: int, admin_id: int, message: str) -> dict:
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')
    message = (message or '').strip()
    if not message:
        raise ValueError('Say what information is needed.')

    affiliate.status = Affiliate.Status.INFO_REQUESTED
    affiliate.rejection_reason = message[:500]
    affiliate.save(update_fields=['status', 'rejection_reason', 'updated_at'])

    _staff_audit(affiliate.id, admin_id, 'application.info_requested',
                 target=f'affiliate:{affiliate.code}', after={'message': message})
    notify(affiliate.id, 'account', 'More information needed', message)
    return _serialize_application(affiliate)


# ---------------------------------------------------------------------------
# Affiliate list and detail
# ---------------------------------------------------------------------------

def list_affiliates(*, status=None, tier=None, commission_type=None, q=None,
                    limit=100, offset=0) -> dict:
    qs = Affiliate.objects.select_related('parent').exclude(
        status__in=[Affiliate.Status.PENDING, Affiliate.Status.REJECTED,
                    Affiliate.Status.INFO_REQUESTED]
    )
    if status and status != 'all':
        qs = qs.filter(status=status)
    if tier:
        qs = qs.filter(tier_label=tier)
    if commission_type:
        qs = qs.filter(commission_type=commission_type)
    if q:
        qs = qs.filter(
            Q(name__icontains=q) | Q(email__icontains=q)
            | Q(company_name__icontains=q) | Q(code__icontains=q)
        )

    total = qs.count()
    rows = list(qs.order_by('-created_at')[offset:offset + limit])
    ids = [a.id for a in rows]

    referral_stats = {
        r['affiliate_id']: r
        for r in AffiliateReferral.objects.filter(affiliate_id__in=ids)
        .values('affiliate_id').annotate(
            total_players=Count('id'),
            active_players=Count('id', filter=Q(status=AffiliateReferral.Status.ACTIVE)),
            total_deposits=Sum('lifetime_deposits'),
        )
    } if ids else {}

    settings = get_program_settings()
    records = []
    for affiliate in rows:
        stats = referral_stats.get(affiliate.id, {})
        records.append({
            'id': affiliate.id,
            'code': affiliate.code,
            'name': affiliate.name,
            'company': affiliate.company_name,
            'email': affiliate.email,
            'status': affiliate.status,
            'tier_label': affiliate.tier_label,
            'commission_tier': affiliate.commission_tier,
            'commission_type': affiliate.commission_type,
            'commission_rate': f(commission_rate_for(affiliate, settings)),
            'cpa_amount': f(cpa_amount_for(affiliate, settings)),
            'override_rate': f(override_rate_for(affiliate, settings)),
            'parent_affiliate_id': affiliate.parent_id,
            'parent_name': affiliate.parent.name if affiliate.parent else None,
            'total_players': stats.get('total_players', 0),
            'active_players': stats.get('active_players', 0),
            'total_deposits': f(stats.get('total_deposits') or 0),
            'total_earnings': f(affiliate.total_commission),
            'pending_earnings': f(affiliate.pending_commission),
            'joined_at': _iso(affiliate.created_at),
            'last_active': _iso(affiliate.last_login_at),
        })

    return {
        'records': records,
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'active': Affiliate.objects.filter(status=Affiliate.Status.APPROVED).count(),
            'suspended': Affiliate.objects.filter(
                status=Affiliate.Status.SUSPENDED).count(),
            'total_earnings': f(
                Affiliate.objects.aggregate(t=Sum('total_commission'))['t'] or 0
            ),
        },
    }


def get_affiliate_detail(affiliate_id: int) -> dict:
    """Everything the detail screen's tabs need, in one response."""
    affiliate = Affiliate.objects.select_related('parent').filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')

    settings = get_program_settings()
    detail = serialize_affiliate(affiliate, settings)
    detail.update(_serialize_application(affiliate))
    detail['id'] = affiliate.id

    referrals = AffiliateReferral.objects.filter(affiliate_id=affiliate.id)
    clicks = AffiliateClick.objects.filter(affiliate_id=affiliate.id).count()
    agg = referrals.aggregate(
        signups=Count('id'),
        ftds=Count('id', filter=Q(first_deposit_at__isnull=False)),
        deposits=Sum('lifetime_deposits'),
        ngr=Sum('lifetime_ngr'),
    )
    detail['stats'] = {
        'clicks': clicks,
        'signups': agg['signups'] or 0,
        'ftds': agg['ftds'] or 0,
        'total_deposits': f(agg['deposits'] or 0),
        'total_ngr': f(agg['ngr'] or 0),
        'total_earnings': f(affiliate.total_commission),
        'pending_earnings': f(affiliate.pending_commission),
        'approved_earnings': f(affiliate.approved_commission),
        'paid_earnings': f(affiliate.paid_commission),
        'links': AffiliateLink.objects.filter(affiliate_id=affiliate.id).count(),
        'open_tickets': AffiliateSupportTicket.objects.filter(
            affiliate_id=affiliate.id, status=AffiliateSupportTicket.Status.OPEN
        ).count(),
    }

    # A list, not the singular object the mock console assumed: an affiliate can
    # register several payout methods.
    detail['payout_methods'] = [
        serialize_payout_method(m)
        for m in AffiliatePayoutMethod.objects.filter(
            affiliate_id=affiliate.id).order_by('-is_primary', 'id')
    ]
    detail['kyc_documents'] = [
        serialize_kyc_document(d)
        for d in AffiliateKycDocument.objects.filter(
            affiliate_id=affiliate.id).order_by('-created_at')
    ]

    recent = list(referrals.order_by('-attributed_at')[:100])
    countries = dict(
        User.objects.filter(id__in=[r.user_id for r in recent])
        .values_list('id', 'country_code')
    ) if recent else {}
    for row in recent:
        row._country_code = countries.get(row.user_id)
    detail['referred_users'] = [serialize_referral(r) for r in recent]

    ledger = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate.id).order_by('-period_start', '-id')[:100]
    source_names = dict(
        Affiliate.objects.filter(
            id__in={e.source_affiliate_id for e in ledger if e.source_affiliate_id}
        ).values_list('id', 'name')
    )
    detail['commission_ledger'] = [
        serialize_ledger_entry(e, source_names) for e in ledger
    ]

    payouts = AffiliatePayout.objects.filter(
        affiliate_id=affiliate.id).order_by('-created_at')[:50]
    detail['payout_history'] = [serialize_payout(p) for p in payouts]

    detail['api_keys'] = [
        serialize_api_key(k)
        for k in AffiliateApiKey.objects.filter(
            affiliate_id=affiliate.id).order_by('-created_at')
    ]
    detail['activity_log'] = [
        {
            'id': row.id, 'actor_type': row.actor_type, 'actor_label': row.actor_label,
            'action': row.action, 'target': row.target, 'ip': row.ip_address,
            'created_at': _iso(row.created_at),
        }
        for row in AffiliateAuditLog.objects.filter(
            affiliate_id=affiliate.id).order_by('-created_at')[:100]
    ]
    return detail


def _would_create_cycle(affiliate_id: int, new_parent_id: int) -> bool:
    """Walk up from the proposed parent looking for this affiliate.

    ``parent_affiliate_id`` has no foreign key and no cycle constraint, so this
    check is the only thing standing between a mis-click and a commission run
    that walks a loop forever.
    """
    seen = set()
    current = new_parent_id
    while current and current not in seen:
        if current == affiliate_id:
            return True
        seen.add(current)
        current = Affiliate.objects.filter(id=current).values_list(
            'parent_id', flat=True).first()
    return False


def update_affiliate(affiliate_id: int, admin_id: int, payload: dict) -> dict:
    """Change an affiliate's commercial terms."""
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')

    before = {
        'commission_type': affiliate.commission_type,
        'commission_rate': f(affiliate.commission_rate),
        'cpa_amount': f(affiliate.cpa_amount),
        'override_rate': f(affiliate.override_rate),
        'parent_affiliate_id': affiliate.parent_id,
        'tier_label': affiliate.tier_label,
    }

    if payload.get('commissionType'):
        if payload['commissionType'] not in dict(Affiliate.CommissionType.choices):
            raise ValueError('Choose a valid commission type.')
        affiliate.commission_type = payload['commissionType']
    if payload.get('commissionRate') is not None:
        rate = money(payload['commissionRate'])
        if rate < ZERO or rate > 100:
            raise ValueError('Commission rate must be between 0 and 100.')
        affiliate.commission_rate = rate
    if payload.get('cpaAmount') is not None:
        affiliate.cpa_amount = money(payload['cpaAmount'])
    if payload.get('overrideRate') is not None:
        rate = money(payload['overrideRate'])
        if rate < ZERO or rate > 100:
            raise ValueError('Override rate must be between 0 and 100.')
        affiliate.override_rate = rate
    if payload.get('hybridCpaDays') is not None:
        affiliate.hybrid_cpa_days = int(payload['hybridCpaDays'] or 0)
    if payload.get('tierLabel'):
        affiliate.tier_label = str(payload['tierLabel'])[:20]
    if payload.get('payoutThreshold') is not None:
        affiliate.payout_threshold = money(payload['payoutThreshold'])

    if 'parentAffiliateId' in payload:
        new_parent_id = payload['parentAffiliateId'] or None
        if new_parent_id:
            new_parent_id = int(new_parent_id)
            if new_parent_id == affiliate.id:
                raise ValueError('An affiliate cannot be their own parent.')
            parent = Affiliate.objects.filter(id=new_parent_id).first()
            if not parent:
                raise ValueError('Parent affiliate not found.')
            if _would_create_cycle(affiliate.id, new_parent_id):
                raise ValueError(
                    'That would create a loop in the network — the chosen parent '
                    'already sits below this affiliate.'
                )
            affiliate.parent_id = new_parent_id
            affiliate.commission_tier = parent.commission_tier + 1
        else:
            affiliate.parent_id = None
            affiliate.commission_tier = 1

    affiliate.save()
    _staff_audit(affiliate.id, admin_id, 'affiliate.updated',
                 target=f'affiliate:{affiliate.code}', before=before, after=payload)
    return get_affiliate_detail(affiliate.id)


def set_affiliate_status(affiliate_id: int, admin_id: int, status: str) -> dict:
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')
    if status not in dict(Affiliate.Status.choices):
        raise ValueError('Choose a valid status.')

    before = {'status': affiliate.status, 'is_active': affiliate.is_active}
    affiliate.status = status
    affiliate.is_active = status == Affiliate.Status.APPROVED
    affiliate.save(update_fields=['status', 'is_active', 'updated_at'])

    _staff_audit(affiliate.id, admin_id, f'affiliate.{status}',
                 target=f'affiliate:{affiliate.code}', before=before,
                 after={'status': status})
    if status == Affiliate.Status.SUSPENDED:
        notify(affiliate.id, 'account', 'Account suspended',
               'Your affiliate account has been suspended. Contact support for details.')
    elif status == Affiliate.Status.APPROVED:
        notify(affiliate.id, 'account', 'Account reactivated',
               'Your affiliate account is active again.')
    return {'id': affiliate.id, 'status': affiliate.status}


def delete_affiliate(affiliate_id: int, admin_id: int) -> dict:
    """Remove an affiliate.

    Refuses while money is outstanding. Deleting cascades the ledger away, and
    an affiliate owed commission must be paid or have it explicitly written off
    before their record can disappear.
    """
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if not affiliate:
        raise ValueError('Affiliate not found')

    outstanding = AffiliateCommissionLedger.objects.filter(
        affiliate_id=affiliate.id,
        status__in=[AffiliateCommissionLedger.Status.PENDING,
                    AffiliateCommissionLedger.Status.APPROVED],
    ).aggregate(total=Sum('amount'))['total'] or ZERO
    if outstanding > ZERO:
        raise ValueError(
            f'This affiliate still has {inr(outstanding)} of unpaid commission. '
            'Pay it out or claw it back before deleting.'
        )
    if Affiliate.objects.filter(parent_id=affiliate.id).exists():
        raise ValueError('Reassign this affiliate\'s sub-affiliates first.')

    code = affiliate.code
    _staff_audit(None, admin_id, 'affiliate.deleted', target=f'affiliate:{code}',
                 before={'id': affiliate.id, 'code': code, 'name': affiliate.name})
    affiliate.delete()
    return {'deleted': True, 'code': code}


def review_kyc_document(affiliate_id: int, doc_id: int, admin_id: int, *, status,
                        reason=None) -> dict:
    doc = AffiliateKycDocument.objects.filter(
        id=doc_id, affiliate_id=affiliate_id
    ).first()
    if not doc:
        raise ValueError('Document not found')
    if status not in dict(AffiliateKycDocument.Status.choices):
        raise ValueError('Choose a valid review outcome.')
    if status == AffiliateKycDocument.Status.REJECTED and not (reason or '').strip():
        raise ValueError('Give a reason when rejecting a document.')

    doc.status = status
    doc.rejection_reason = (reason or '').strip() or None
    doc.reviewed_by = admin_id
    doc.reviewed_at = timezone.now()
    doc.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at'])

    # The affiliate's KYC state is derived: verified only when nothing is
    # outstanding and nothing was refused.
    docs = AffiliateKycDocument.objects.filter(affiliate_id=affiliate_id)
    affiliate = Affiliate.objects.filter(id=affiliate_id).first()
    if docs.filter(status=AffiliateKycDocument.Status.REJECTED).exists():
        affiliate.kyc_status = Affiliate.KycStatus.REJECTED
    elif docs.filter(status=AffiliateKycDocument.Status.PENDING).exists():
        affiliate.kyc_status = Affiliate.KycStatus.PENDING
    elif docs.exists():
        affiliate.kyc_status = Affiliate.KycStatus.VERIFIED
    affiliate.save(update_fields=['kyc_status', 'updated_at'])

    _staff_audit(affiliate_id, admin_id, f'kyc.{status}', target=f'document:{doc_id}',
                 after={'status': status, 'reason': reason})
    notify(affiliate_id, 'account', f'KYC document {status}',
           reason or f'Your {doc.get_document_type_display()} was {status}.')
    return serialize_kyc_document(doc)


def revoke_affiliate_key(affiliate_id: int, key_id: int, admin_id: int) -> dict:
    key = AffiliateApiKey.objects.filter(id=key_id, affiliate_id=affiliate_id).first()
    if not key:
        raise ValueError('Key not found')
    key.status = AffiliateApiKey.Status.REVOKED
    key.revoked_at = timezone.now()
    key.grace_until = None
    key.save(update_fields=['status', 'revoked_at', 'grace_until'])
    _staff_audit(affiliate_id, admin_id, 'api_key.revoked_by_staff',
                 target=f'key:{key.key_id}')
    notify(affiliate_id, 'key-rotation', 'API key revoked',
           f'Key {key.key_id} was revoked by the platform team.')
    return serialize_api_key(key)


# ---------------------------------------------------------------------------
# Payout approvals
# ---------------------------------------------------------------------------

def list_payout_requests(*, status=None, limit=50, offset=0) -> dict:
    qs = AffiliatePayout.objects.select_related('affiliate')
    if status and status != 'all':
        qs = qs.filter(status=status)
    total = qs.count()
    rows = list(qs.order_by('-requested_at', '-created_at')[offset:offset + limit])
    entry_counts = dict(
        AffiliateCommissionLedger.objects.filter(payout_id__in=[p.id for p in rows])
        .values('payout_id').annotate(n=Count('id')).values_list('payout_id', 'n')
    ) if rows else {}

    records = []
    for payout in rows:
        row = serialize_payout(payout, entry_counts.get(payout.id, 0))
        row.update({
            'affiliate_id': payout.affiliate_id,
            'affiliate_name': payout.affiliate.name,
            'affiliate_code': payout.affiliate.code,
            'tier_label': payout.affiliate.tier_label,
        })
        records.append(row)

    pending_total = AffiliatePayout.objects.filter(
        status=AffiliatePayout.Status.REQUESTED
    ).aggregate(total=Sum('amount'))['total'] or ZERO
    return {
        'records': records,
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'pending_count': AffiliatePayout.objects.filter(
                status=AffiliatePayout.Status.REQUESTED).count(),
            'pending_amount': f(pending_total),
            'paid_this_month': f(
                AffiliatePayout.objects.filter(
                    status=AffiliatePayout.Status.PAID,
                    processed_at__gte=timezone.now().replace(
                        day=1, hour=0, minute=0, second=0, microsecond=0),
                ).aggregate(total=Sum('amount'))['total'] or 0
            ),
        },
    }


def approve_payout(payout_id: int, admin_id: int) -> dict:
    """Sign off a payout. Money has not moved yet — that is the `pay` step."""
    with tenant_atomic():
        payout = AffiliatePayout.objects.select_for_update().filter(
            id=payout_id).first()
        if not payout:
            raise ValueError('Payout not found')
        if payout.status != AffiliatePayout.Status.REQUESTED:
            raise ValueError(f'This payout is already {payout.status}.')
        payout.status = AffiliatePayout.Status.APPROVED
        payout.processed_by = admin_id
        payout.save(update_fields=['status', 'processed_by', 'updated_at'])

    _staff_audit(payout.affiliate_id, admin_id, 'payout.approved',
                 target=f'payout:{payout.id}', after={'amount': f(payout.amount)})
    notify(payout.affiliate_id, 'payout', 'Payout approved',
           f'Your payout of {inr(payout.amount)} has been approved and is being sent.')
    return serialize_payout(payout)


def mark_payout_paid(payout_id: int, admin_id: int, reference: str) -> dict:
    """Record that the transfer actually happened.

    Flips the claimed ledger rows to `paid` in the same transaction, so the
    ledger can never say "paid" for a payout that is not, or the reverse.
    """
    reference = (reference or '').strip()
    if not reference:
        raise ValueError('Enter the bank or transfer reference.')

    with tenant_atomic():
        payout = AffiliatePayout.objects.select_for_update().filter(
            id=payout_id).first()
        if not payout:
            raise ValueError('Payout not found')
        if payout.status == AffiliatePayout.Status.PAID:
            raise ValueError('This payout is already marked paid.')
        if payout.status not in (AffiliatePayout.Status.REQUESTED,
                                 AffiliatePayout.Status.APPROVED):
            raise ValueError(f'This payout is {payout.status} and cannot be paid.')

        now = timezone.now()
        payout.status = AffiliatePayout.Status.PAID
        payout.reference = reference[:120]
        payout.processed_at = now
        payout.processed_by = admin_id
        payout.save(update_fields=['status', 'reference', 'processed_at',
                                   'processed_by', 'updated_at'])
        AffiliateCommissionLedger.objects.filter(payout_id=payout.id).update(
            status=AffiliateCommissionLedger.Status.PAID, paid_at=now
        )

    affiliate_commission.refresh_commission_caches()
    _staff_audit(payout.affiliate_id, admin_id, 'payout.paid',
                 target=f'payout:{payout.id}',
                 after={'amount': f(payout.amount), 'reference': reference})
    notify(payout.affiliate_id, 'payout', 'Payout sent',
           f'{inr(payout.amount)} has been sent. Reference: {reference}.')
    return serialize_payout(payout)


def reject_payout(payout_id: int, admin_id: int, reason: str) -> dict:
    """Turn down a payout and release its commission.

    Releasing the claim matters: without clearing ``payout_id`` the entries
    would stay attached to a dead payout and the affiliate could never withdraw
    that money again.
    """
    reason = (reason or '').strip()
    if not reason:
        raise ValueError('Give a reason — the affiliate is shown this.')

    with tenant_atomic():
        payout = AffiliatePayout.objects.select_for_update().filter(
            id=payout_id).first()
        if not payout:
            raise ValueError('Payout not found')
        if payout.status == AffiliatePayout.Status.PAID:
            raise ValueError('This payout has already been paid.')

        payout.status = AffiliatePayout.Status.REJECTED
        payout.rejection_reason = reason[:500]
        payout.processed_at = timezone.now()
        payout.processed_by = admin_id
        payout.save(update_fields=['status', 'rejection_reason', 'processed_at',
                                   'processed_by', 'updated_at'])
        AffiliateCommissionLedger.objects.filter(payout_id=payout.id).update(
            payout_id=None
        )

    _staff_audit(payout.affiliate_id, admin_id, 'payout.rejected',
                 target=f'payout:{payout.id}', after={'reason': reason})
    notify(payout.affiliate_id, 'payout', 'Payout rejected', reason)
    return serialize_payout(payout)


def bulk_payout_action(ids: list, admin_id: int, action: str, *, reference=None,
                       reason=None) -> dict:
    """Apply one action across several payouts.

    Each is handled independently: one failure reports itself and the rest still
    go through, rather than a single bad row voiding the whole batch.
    """
    if not ids:
        raise ValueError('Select at least one payout.')
    handlers = {
        'approve': lambda pid: approve_payout(pid, admin_id),
        'pay': lambda pid: mark_payout_paid(pid, admin_id, reference),
        'reject': lambda pid: reject_payout(pid, admin_id, reason),
    }
    if action not in handlers:
        raise ValueError('Choose approve, pay or reject.')

    succeeded, failed = [], []
    for payout_id in ids:
        try:
            handlers[action](int(payout_id))
            succeeded.append(int(payout_id))
        except (ValueError, TypeError) as exc:
            failed.append({'id': payout_id, 'error': str(exc)})
    return {'action': action, 'succeeded': succeeded, 'failed': failed,
            'succeeded_count': len(succeeded), 'failed_count': len(failed)}


# ---------------------------------------------------------------------------
# Ledger corrections
# ---------------------------------------------------------------------------

def approve_ledger_entry(entry_id: int, admin_id: int) -> dict:
    with tenant_atomic():
        entry = AffiliateCommissionLedger.objects.select_for_update().filter(
            id=entry_id).first()
        if not entry:
            raise ValueError('Ledger entry not found')
        if entry.status != AffiliateCommissionLedger.Status.PENDING:
            raise ValueError(f'This entry is already {entry.status}.')
        entry.status = AffiliateCommissionLedger.Status.APPROVED
        entry.approved_at = timezone.now()
        entry.save(update_fields=['status', 'approved_at', 'updated_at'])

    affiliate_commission.refresh_commission_caches()
    _staff_audit(entry.affiliate_id, admin_id, 'ledger.approved',
                 target=f'entry:{entry.id}', after={'amount': f(entry.amount)})
    return serialize_ledger_entry(entry)


def clawback_ledger_entry(entry_id: int, admin_id: int, reason: str) -> dict:
    """Reverse commission that should not have been earned.

    Writes a compensating negative entry rather than editing the original: the
    ledger is a record of what happened, and rewriting it would destroy the
    evidence of the mistake.
    """
    reason = (reason or '').strip()
    if not reason:
        raise ValueError('Give a reason for the clawback.')

    with tenant_atomic():
        entry = AffiliateCommissionLedger.objects.select_for_update().filter(
            id=entry_id).first()
        if not entry:
            raise ValueError('Ledger entry not found')
        if entry.status == AffiliateCommissionLedger.Status.CLAWED_BACK:
            raise ValueError('This entry has already been clawed back.')

        entry.status = AffiliateCommissionLedger.Status.CLAWED_BACK
        entry.notes = reason[:255]
        entry.save(update_fields=['status', 'notes', 'updated_at'])

        AffiliateCommissionLedger.objects.create(
            affiliate_id=entry.affiliate_id,
            referral_id=entry.referral_id,
            source_affiliate_id=entry.source_affiliate_id,
            entry_type=AffiliateCommissionLedger.EntryType.CLAWBACK,
            base_kind=AffiliateCommissionLedger.BaseKind.MANUAL,
            base_amount=entry.amount,
            rate=ZERO,
            amount=-entry.amount,
            currency=entry.currency,
            status=AffiliateCommissionLedger.Status.APPROVED,
            period_start=entry.period_start,
            period_end=entry.period_end,
            dedupe_key=f'clawback:{entry.id}',
            notes=reason[:255],
            approved_at=timezone.now(),
        )

    affiliate_commission.refresh_commission_caches()
    _staff_audit(entry.affiliate_id, admin_id, 'ledger.clawed_back',
                 target=f'entry:{entry.id}',
                 after={'amount': f(entry.amount), 'reason': reason})
    notify(entry.affiliate_id, 'commission', 'Commission reversed',
           f'{inr(entry.amount)} was reversed. Reason: {reason}')
    return serialize_ledger_entry(entry)


# ---------------------------------------------------------------------------
# Fraud, audit and settings
# ---------------------------------------------------------------------------

def list_fraud_flags(*, status=None, risk_level=None, limit=100, offset=0) -> dict:
    qs = AffiliateFraudFlag.objects.select_related('affiliate')
    if status and status != 'all':
        qs = qs.filter(status=status)
    if risk_level:
        qs = qs.filter(risk_level=risk_level)
    total = qs.count()
    return {
        'records': [
            {
                'id': row.id,
                'affiliate_id': row.affiliate_id,
                'affiliate_name': row.affiliate.name,
                'affiliate_code': row.affiliate.code,
                'referral_id': row.referral_id,
                'reason': row.reason,
                'rule_key': row.rule_key,
                'risk_level': row.risk_level,
                'status': row.status,
                'metadata': row.metadata or {},
                'created_at': _iso(row.created_at),
                'resolved_at': _iso(row.resolved_at),
            }
            for row in qs.order_by('-created_at')[offset:offset + limit]
        ],
        'total': total,
        'limit': limit,
        'offset': offset,
        'summary': {
            'open': AffiliateFraudFlag.objects.filter(
                status=AffiliateFraudFlag.Status.OPEN).count(),
            'critical': AffiliateFraudFlag.objects.filter(
                status=AffiliateFraudFlag.Status.OPEN,
                risk_level=AffiliateFraudFlag.RiskLevel.CRITICAL).count(),
        },
    }


def resolve_fraud_flag(flag_id: int, admin_id: int, *, status, note=None) -> dict:
    flag = AffiliateFraudFlag.objects.filter(id=flag_id).first()
    if not flag:
        raise ValueError('Flag not found')
    if status not in (AffiliateFraudFlag.Status.DISMISSED,
                      AffiliateFraudFlag.Status.ACTIONED):
        raise ValueError('Choose dismissed or actioned.')

    flag.status = status
    flag.resolved_by = admin_id
    flag.resolved_at = timezone.now()
    if note:
        metadata = dict(flag.metadata or {})
        metadata['resolution_note'] = note
        flag.metadata = metadata
    flag.save(update_fields=['status', 'resolved_by', 'resolved_at', 'metadata'])

    _staff_audit(flag.affiliate_id, admin_id, f'fraud.{status}',
                 target=f'flag:{flag.id}', after={'note': note})
    return {'id': flag.id, 'status': flag.status}


def list_audit_log(*, affiliate_id=None, date_from=None, date_to=None,
                   limit=100, offset=0) -> dict:
    qs = AffiliateAuditLog.objects.select_related('affiliate')
    if affiliate_id:
        qs = qs.filter(affiliate_id=affiliate_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)
    total = qs.count()
    return {
        'records': [
            {
                'id': row.id,
                'affiliate_id': row.affiliate_id,
                'affiliate_name': row.affiliate.name if row.affiliate else None,
                'actor_type': row.actor_type,
                'actor_id': row.actor_id,
                'actor_label': row.actor_label,
                'action': row.action,
                'target': row.target,
                'before_value': row.before_value,
                'after_value': row.after_value,
                'ip': row.ip_address,
                'created_at': _iso(row.created_at),
            }
            for row in qs.order_by('-created_at')[offset:offset + limit]
        ],
        'total': total,
        'limit': limit,
        'offset': offset,
    }


def get_settings() -> dict:
    return get_program_settings()


def update_settings(payload: dict, admin_id: int) -> dict:
    before = get_program_settings()
    updated = save_program_settings(payload or {})
    _staff_audit(None, admin_id, 'settings.updated', target='affiliate_program',
                 before=before, after=updated)
    return updated


# ---------------------------------------------------------------------------
# Commission runs
# ---------------------------------------------------------------------------

def trigger_commission_run(admin_id: int, *, date_from=None, date_to=None,
                           dry_run=False) -> dict:
    """The console's "Run now" button.

    Calls exactly the same entry point as the scheduled command, so a manual run
    and a nightly run can never diverge in behaviour.
    """
    from datetime import date as date_cls

    def parse(value, label):
        if not value:
            return None
        try:
            return date_cls.fromisoformat(str(value)[:10])
        except ValueError:
            raise ValueError(f'{label} must be a date in YYYY-MM-DD format.')

    result = affiliate_commission.run_commissions(
        period_start=parse(date_from, 'Start date'),
        period_end=parse(date_to, 'End date'),
        trigger_source='admin',
        triggered_by=admin_id,
        dry_run=bool(dry_run),
    )
    if not dry_run:
        _staff_audit(None, admin_id, 'commissions.run', target=f'run:{result["id"]}',
                     after=result)
    return result


def list_commission_runs(limit: int = 25, offset: int = 0) -> dict:
    qs = AffiliateCommissionRun.objects.order_by('-started_at')
    total = qs.count()
    return {
        'records': [
            {
                'id': row.id,
                'period_start': row.period_start.isoformat() if row.period_start else None,
                'period_end': row.period_end.isoformat() if row.period_end else None,
                'status': row.status,
                'trigger_source': row.trigger_source,
                'triggered_by': row.triggered_by,
                'triggered_by_label': _actor_label(row.triggered_by)
                if row.triggered_by else 'scheduler',
                'entries_written': row.entries_written,
                'entries_skipped': row.entries_skipped,
                'entries_approved': row.entries_approved,
                'total_amount': f(row.total_amount),
                'error': row.error,
                'started_at': _iso(row.started_at),
                'finished_at': _iso(row.finished_at),
            }
            for row in qs[offset:offset + limit]
        ],
        'total': total,
        'limit': limit,
        'offset': offset,
    }
