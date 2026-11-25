"""Manual deposit: the player pays into one of our receiving accounts, then
submits the UTR and a payment screenshot. Nothing is credited here — the
deposit sits PENDING in the admin cashier queue until an admin verifies the
UTR / screenshot and approves it (services.confirm_deposit) or rejects it.

The receiving accounts are the admin's Backoffice → Payment Methods rows
(services.list_deposit_methods); the screenshot is uploaded first through
/wallet/deposit/proof, which validates and stores it.
"""

from __future__ import annotations

import re
from decimal import Decimal
from urllib.parse import urlsplit

from django.utils import timezone

from core import deposit_gateway, services
from core.models import Transaction

# UPI UTR / IMPS RRN are 12 digits, NEFT UTRs 16 characters, crypto hashes
# longer — so letters and digits, 6–100 of them (spaces stripped).
_UTR_RE = re.compile(r'^[A-Za-z0-9]{6,100}$')


def normalize_utr(raw) -> str:
    utr = re.sub(r'\s+', '', str(raw or ''))
    if not _UTR_RE.match(utr):
        raise ValueError(
            'Enter the UTR / transaction reference from your payment app '
            '(letters and numbers only).'
        )
    return utr


def _check_proof_url(raw) -> str:
    url = str(raw or '').strip()
    if not url:
        raise ValueError('Upload a screenshot of your payment.')
    parts = urlsplit(url)
    # Only a file our own proof upload stored (…/uploads/<tenant>/deposits/…).
    if len(url) > 500 or parts.scheme not in ('http', 'https', '') or '/deposits/' not in parts.path:
        raise ValueError('Please upload the payment screenshot again.')
    return url


def _rupees(value) -> str:
    return f'₹{Decimal(value):,.0f}'


def submit(
    user_id: int,
    amount,
    method_code: str | None,
    utr,
    proof_url,
    *,
    affiliate_ref: str | None = None,
    affiliate_sub: str | None = None,
    affiliate_click_id=None,
    client_ip: str | None = None,
) -> dict:
    from core.backoffice_models import PaymentMethod

    services._require_player(user_id)
    value = deposit_gateway._parse_amount(amount)
    method = PaymentMethod.objects.filter(
        code=str(method_code or ''), is_active=True, supports_deposit=True
    ).first()
    if method is None:
        raise ValueError('Choose the account you paid into.')
    if method.min_amount and value < method.min_amount:
        raise ValueError(f'Minimum deposit for {method.name} is {_rupees(method.min_amount)}.')
    if method.max_amount is not None and value > method.max_amount:
        raise ValueError(f'Maximum deposit for {method.name} is {_rupees(method.max_amount)}.')
    reference = normalize_utr(utr)
    proof = _check_proof_url(proof_url)

    # An online checkout the player walked away from (still PROCESSING) must
    # not block this deposit. If that order is paid after all, the gateway's
    # late-success path still records it.
    Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.PROCESSING,
        payment_method__in=(deposit_gateway.GATEWAY_CHANNEL, deposit_gateway.P2PPAY_CHANNEL),
    ).update(status=Transaction.Status.CANCELLED, updated_at=timezone.now())

    # Refuses a second open request and a UTR that was already used.
    created = services.create_deposit(
        user_id,
        float(value),
        method.code,
        'INR',
        reference_number=reference,
        payment_proof_url=proof,
        affiliate_ref=affiliate_ref,
        affiliate_sub=affiliate_sub,
        affiliate_click_id=affiliate_click_id,
        client_ip=client_ip,
    )
    return {
        'success': True,
        'gateway': deposit_gateway.MANUAL_CHANNEL,
        'transactionId': created['transactionId'],
        'amount': float(value),
        'method': method.name,
        'utr': reference,
        'status': 'awaiting_approval',
    }
