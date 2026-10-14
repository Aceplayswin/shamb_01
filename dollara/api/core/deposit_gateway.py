"""Wallet deposit via Paygate (create order → hosted checkout → verify).

Mirrors the merchant checkout structure: the API signs the order, fetches the
per-order Razorpay payload, and credits the wallet only after Paygate confirms
the payment (verify, status poll, or merchant callback).
"""

from __future__ import annotations

import json
import logging
import re
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone

from core import paygate, services
from core.models import Transaction, User, Wallet
from core.paygate import PaygateError
from tenants.state import tenant_atomic

logger = logging.getLogger('paygate')

MIN_GATEWAY_DEPOSIT = Decimal('100')
GATEWAY_CHANNEL = 'paygate'


def _notes(tx: Transaction) -> dict:
    raw = tx.notes or ''
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (TypeError, ValueError):
        return {}


def _save_notes(tx: Transaction, extra: dict) -> None:
    merged = {**_notes(tx), **extra}
    tx.notes = json.dumps(merged)
    tx.save(update_fields=['notes', 'updated_at'])


def _customer_phone(user: User) -> str:
    digits = re.sub(r'\D', '', user.phone or '')
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10 or digits[0] not in '6789':
        raise ValueError('A valid 10-digit mobile number is required to pay.')
    return digits


def _customer_name(user: User) -> str:
    name = (user.full_name or user.username or 'Player').strip()
    return name[:80] or 'Player'


def _parse_amount(amount) -> Decimal:
    try:
        value = Decimal(str(amount))
    except (InvalidOperation, TypeError):
        raise ValueError('Amount must be greater than zero')
    if value <= 0:
        raise ValueError('Amount must be greater than zero')
    if value < MIN_GATEWAY_DEPOSIT:
        raise ValueError(f'Minimum deposit is ₹{MIN_GATEWAY_DEPOSIT}')
    return value


def _cancel_inflight_gateway(user_id: int) -> None:
    Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.PROCESSING,
    ).update(status=Transaction.Status.CANCELLED, updated_at=timezone.now())


def _manual_pending(user_id: int) -> bool:
    return Transaction.objects.filter(
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
        status=Transaction.Status.PENDING,
    ).exists()


def _order_id_for(tx: Transaction) -> str:
    stored = _notes(tx).get('merchantOrderId')
    if stored:
        return str(stored)
    if tx.reference_number:
        return tx.reference_number
    return f'DEP-{tx.id}'


def _to_public_status(tx: Transaction) -> str:
    if tx.status == Transaction.Status.COMPLETED:
        return 'success'
    if tx.status in (
        Transaction.Status.FAILED,
        Transaction.Status.REJECTED,
        Transaction.Status.CANCELLED,
    ):
        return 'failed'
    return 'pending'


def start_checkout(
    user_id: int,
    amount,
    *,
    payment_method: str | None = None,
    affiliate_ref: str | None = None,
    affiliate_sub: str | None = None,
    affiliate_click_id=None,
    client_ip: str | None = None,
) -> dict:
    services._require_player(user_id)
    value = _parse_amount(amount)
    if _manual_pending(user_id):
        raise ValueError(services.PENDING_DEPOSIT_MESSAGE)

    user = User.objects.get(id=user_id)
    phone = _customer_phone(user)
    name = _customer_name(user)
    Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': 'INR'})

    with tenant_atomic():
        Wallet.objects.select_for_update().get(user_id=user_id)
        if _manual_pending(user_id):
            raise ValueError(services.PENDING_DEPOSIT_MESSAGE)
        _cancel_inflight_gateway(user_id)
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.DEPOSIT,
            amount=value,
            currency='INR',
            status=Transaction.Status.PROCESSING,
            payment_method=(payment_method or GATEWAY_CHANNEL)[:50],
        )

    order_id = f'DEP-{tx.id}'
    redirect_url = f'{settings.WEB_URL.rstrip("/")}/deposit?tx={tx.id}'
    try:
        created = paygate.initiate_payment(
            customer_name=name,
            customer_phone=phone,
            amount=value,
            order_id=order_id,
            redirect_url=redirect_url,
            remark1=f'Wallet deposit #{tx.id}',
        )
        payment_url = created.get('paymentUrl') or ''
        if not payment_url:
            raise PaygateError('Gateway did not return a payment URL.', status=502)
        hosted = paygate.fetch_checkout(payment_url)
    except PaygateError:
        tx.status = Transaction.Status.FAILED
        tx.error_message = 'Gateway did not accept the deposit order.'[:500]
        tx.save(update_fields=['status', 'error_message', 'updated_at'])
        raise
    except Exception as exc:
        tx.status = Transaction.Status.FAILED
        tx.error_message = str(exc)[:500]
        tx.save(update_fields=['status', 'error_message', 'updated_at'])
        raise PaygateError(str(exc) or 'Failed to initiate payment.', status=502) from exc

    checkout = hosted.get('checkout') if isinstance(hosted, dict) else None
    if not isinstance(checkout, dict):
        checkout = {}
    byte_id = created.get('referenceId') or hosted.get('byteTransactionId')
    merchant_order_id = created.get('orderId') or hosted.get('merchantOrderId') or order_id

    tx.reference_number = str(merchant_order_id)
    tx.provider_payment_id = str(byte_id) if byte_id else None
    tx.notes = json.dumps(
        {
            'channel': GATEWAY_CHANNEL,
            'merchantOrderId': merchant_order_id,
            'byteTransactionId': byte_id,
            'razorpayOrderId': (checkout or {}).get('order_id'),
            'paymentUrl': created.get('paymentUrl'),
        }
    )
    tx.save(
        update_fields=[
            'reference_number',
            'provider_payment_id',
            'notes',
            'updated_at',
        ]
    )

    if affiliate_ref or affiliate_click_id:
        try:
            from core import affiliate_services

            affiliate_services.ensure_deposit_attribution(
                user_id,
                affiliate_ref,
                affiliate_sub,
                affiliate_click_id,
                ip=client_ip,
                phone=user.phone,
            )
        except Exception:
            logger.exception('ensure_deposit_attribution failed for user %s', user_id)

    if not checkout.get('key') or not checkout.get('order_id'):
        raise PaygateError('Gateway did not return a checkout payload.', status=502)

    return {
        'success': True,
        'transactionId': tx.id,
        'orderId': order_id,
        'checkout': checkout,
        'byteTransactionId': byte_id,
        'paymentUrl': created.get('paymentUrl'),
    }


def _credit_if_needed(tx: Transaction, *, utr: str | None = None) -> Transaction:
    if utr:
        extra = {'utr': utr}
        _save_notes(tx, extra)
        tx.refresh_from_db()
    if tx.status == Transaction.Status.COMPLETED:
        return tx
    services.confirm_deposit(tx.id, tx.reference_number or _order_id_for(tx))
    tx.refresh_from_db()
    return tx


def _mark_failed(tx: Transaction, message: str | None = None) -> Transaction:
    if tx.status in (
        Transaction.Status.COMPLETED,
        Transaction.Status.FAILED,
        Transaction.Status.REJECTED,
        Transaction.Status.CANCELLED,
    ):
        return tx
    tx.status = Transaction.Status.FAILED
    if message:
        tx.error_message = str(message)[:500]
        tx.save(update_fields=['status', 'error_message', 'updated_at'])
    else:
        tx.save(update_fields=['status', 'updated_at'])
    return tx


def verify_checkout(
    user_id: int,
    *,
    transaction_id: int,
    byte_transaction_id: str | None,
    razorpay_order_id: str | None,
    razorpay_payment_id: str | None,
    razorpay_signature: str | None,
) -> dict:
    services._require_player(user_id)
    tx = Transaction.objects.get(
        id=transaction_id,
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
    )
    notes = _notes(tx)
    byte_id = byte_transaction_id or notes.get('byteTransactionId') or tx.provider_payment_id
    if not byte_id or not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        raise ValueError('Payment verification details are incomplete.')

    verification = paygate.verify_payment(
        byte_transaction_id=str(byte_id),
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
    )
    _save_notes(
        tx,
        {
            'razorpayPaymentId': razorpay_payment_id,
            'verifiedAt': timezone.now().isoformat(),
        },
    )
    tx.refresh_from_db()
    status = str((verification or {}).get('status') or '').lower()
    if status == 'success':
        tx = _credit_if_needed(tx)
    return {
        'success': True,
        'status': _to_public_status(tx),
        'transactionId': tx.id,
    }


def abandon_checkout(user_id: int, transaction_id: int) -> dict:
    services._require_player(user_id)
    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(
            id=transaction_id,
            user_id=user_id,
            type=Transaction.TxType.DEPOSIT,
        )
        if tx.status == Transaction.Status.PROCESSING:
            tx.status = Transaction.Status.CANCELLED
            tx.save(update_fields=['status', 'updated_at'])
    return {'success': True, 'status': _to_public_status(tx), 'transactionId': tx.id}


def _refresh_from_gateway(tx: Transaction) -> Transaction:
    if tx.status != Transaction.Status.PROCESSING:
        return tx
    merchant_order_id = _order_id_for(tx)
    try:
        live = paygate.get_order_status(merchant_order_id)
    except PaygateError:
        return tx
    api_status = str((live or {}).get('status') or '').lower()
    utr = (live or {}).get('utr')
    if api_status == 'paid':
        return _credit_if_needed(tx, utr=str(utr) if utr else None)
    if api_status in ('failed', 'refunded'):
        return _mark_failed(tx, api_status)
    return tx


def get_checkout_status(user_id: int, transaction_id: int) -> dict:
    services._require_player(user_id)
    tx = Transaction.objects.get(
        id=transaction_id,
        user_id=user_id,
        type=Transaction.TxType.DEPOSIT,
    )
    tx = _refresh_from_gateway(tx)
    notes = _notes(tx)
    return {
        'success': True,
        'transactionId': tx.id,
        'orderId': _order_id_for(tx),
        'amount': float(tx.amount),
        'status': _to_public_status(tx),
        'utr': notes.get('utr'),
    }


def handle_callback(order_id: str | None, status: str | None, utr: str | None = None) -> dict:
    if not order_id:
        return {'received': True}
    tx = (
        Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            reference_number=order_id,
        ).first()
        or Transaction.objects.filter(
            type=Transaction.TxType.DEPOSIT,
            notes__contains=str(order_id),
        ).first()
    )
    if tx is None and str(order_id).startswith('DEP-'):
        try:
            tx_id = int(str(order_id).split('-', 1)[1])
            tx = Transaction.objects.filter(id=tx_id, type=Transaction.TxType.DEPOSIT).first()
        except (TypeError, ValueError):
            tx = None
    logger.info('paygate-callback order=%s status=%s utr=%s', order_id, status, utr or '-')
    if tx is None:
        return {'received': True}
    if str(status or '').upper() == 'SUCCESS':
        _credit_if_needed(tx, utr=str(utr) if utr else None)
    elif str(status or '').upper() in ('FAILED', 'FAILURE'):
        _mark_failed(tx, str(status))
    return {'received': True}
