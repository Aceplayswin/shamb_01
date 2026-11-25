"""Wallet deposit via P2P·PAY (create order → hosted checkout → webhook).

1. ``start_checkout`` opens a PROCESSING deposit row, creates a P2P·PAY order
   with clientRef "<prefix>-<tx id>", and hands the browser the checkoutUrl.
2. The player pays from their UPI app / bank on P2P·PAY's page and enters the
   UTR; P2P·PAY confirms the money and sends them back to /deposit?tx=<id>.
3. The signed webhook (or our own GET /orders refresh while the result view
   polls) settles the row, under a row lock, through the same state helpers as
   the Paygate flow:
     SUCCESS          → PENDING, awaiting admin approval (credited at once
                        only when P2PPAY_AUTO_CREDIT is on)
     FAILED / EXPIRED → FAILED

Only a signed webhook or our own GET /orders call changes money state — never
the status in the return URL's query string, which anyone can type.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings

from core import deposit_gateway, p2ppay, services
from core.deposit_gateway import _notes, _save_notes
from core.models import Transaction, User, Wallet
from core.p2ppay import P2PPayError
from tenants.state import tenant_atomic

logger = logging.getLogger('p2ppay')

GATEWAY_CODE = 'p2ppay'
# Webhook notice ids remembered per deposit (repeats are normal; each id is
# handled once).
_MAX_REMEMBERED_EVENTS = 20


def _cfg() -> dict:
    return getattr(settings, 'P2PPAY', {}) or {}


def client_ref_for(tx_id: int) -> str:
    prefix = str(_cfg().get('REF_PREFIX') or 'P2P').strip() or 'P2P'
    return f'{prefix}-{tx_id}'[:64]


def _return_url(tx_id: int) -> str:
    # P2P·PAY appends orderId/clientRef/status; the deposit page only reads tx
    # and asks this API for the real status.
    return f'{settings.WEB_URL.rstrip("/")}/deposit?tx={tx_id}'


def is_p2ppay_tx(tx: Transaction) -> bool:
    return _notes(tx).get('channel') == GATEWAY_CODE


def _amount_mismatch(remote_amount, local_amount) -> bool:
    if remote_amount in (None, ''):
        return False
    try:
        return Decimal(str(remote_amount)).quantize(Decimal('0.01')) != Decimal(
            str(local_amount)
        ).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return True


def _belongs(tx: Transaction, data: dict) -> bool:
    client_ref = data.get('clientRef')
    order_id = data.get('orderId')
    if client_ref and tx.reference_number and str(client_ref) == tx.reference_number:
        return True
    if order_id and tx.provider_payment_id and str(order_id) == tx.provider_payment_id:
        return True
    return False


# --- Checkout -------------------------------------------------------------


def _create_or_recover(value: Decimal, client_ref: str, tx_id: int) -> dict:
    return_url = _return_url(tx_id)
    try:
        return p2ppay.create_order(
            amount=value,
            client_ref=client_ref,
            success_url=return_url,
            failure_url=return_url,
            note=f'Wallet deposit #{tx_id}',
        )
    except P2PPayError as exc:
        if not exc.ambiguous:
            raise
        # Timed out / 5xx: the order may exist anyway. Per the API guide, look
        # the clientRef up instead of creating a second order.
        try:
            recovered = p2ppay.get_order(client_ref)
        except P2PPayError:
            raise exc
        logger.info('p2ppay-recovered order for %s after %s', client_ref, exc.code)
        return recovered


def _fail_start(tx: Transaction, message: str) -> None:
    tx.refresh_from_db()
    deposit_gateway._mark_failed(tx, message)


def start_checkout(
    user_id: int,
    amount,
    *,
    affiliate_ref: str | None = None,
    affiliate_sub: str | None = None,
    affiliate_click_id=None,
    client_ip: str | None = None,
) -> dict:
    services._require_player(user_id)
    value = deposit_gateway._parse_amount(amount)
    if not p2ppay.is_configured():
        raise P2PPayError(
            'This payment method is not configured.', status=503, code='NOT_CONFIGURED'
        )
    if deposit_gateway._manual_pending(user_id):
        raise ValueError(services.PENDING_DEPOSIT_MESSAGE)

    user = User.objects.get(id=user_id)
    Wallet.objects.get_or_create(user_id=user_id, defaults={'currency': 'INR'})

    with tenant_atomic():
        Wallet.objects.select_for_update().get(user_id=user_id)
        if deposit_gateway._manual_pending(user_id):
            raise ValueError(services.PENDING_DEPOSIT_MESSAGE)
        # Only one open checkout per player. A cancelled P2P·PAY order that is
        # paid anyway is still picked up by the webhook (late success).
        deposit_gateway._cancel_inflight_gateway(user_id)
        tx = Transaction.objects.create(
            user_id=user_id,
            type=Transaction.TxType.DEPOSIT,
            amount=value,
            currency='INR',
            status=Transaction.Status.PROCESSING,
            payment_method=GATEWAY_CODE,
        )
        # Stamped before calling the gateway so a webhook for this order can
        # always find the row, even if our create call times out.
        client_ref = client_ref_for(tx.id)
        tx.reference_number = client_ref
        tx.notes = json.dumps({'channel': GATEWAY_CODE, 'clientRef': client_ref})
        tx.save(update_fields=['reference_number', 'notes', 'updated_at'])

    try:
        order = _create_or_recover(value, client_ref, tx.id)
    except P2PPayError as exc:
        _fail_start(tx, f'Gateway refused the order: {exc.code or exc}')
        raise
    except Exception as exc:
        logger.exception('p2ppay-start failed for tx %s', tx.id)
        _fail_start(tx, 'Could not start the payment.')
        raise P2PPayError(
            'Could not start the payment. Please try again.', status=502
        ) from exc

    order_id = order.get('orderId')
    checkout_url = order.get('checkoutUrl') or (
        p2ppay.checkout_url_for(order_id) if order_id else ''
    )
    if not order_id or not checkout_url:
        _fail_start(tx, 'Gateway did not return a checkout page.')
        raise P2PPayError('Gateway did not return a checkout page.', status=502)
    if _amount_mismatch(order.get('amount'), value):
        logger.error(
            'p2ppay-start amount mismatch tx=%s sent=%s got=%s',
            tx.id, value, order.get('amount'),
        )
        _fail_start(tx, 'Gateway returned a different amount.')
        raise P2PPayError('Payment gateway error. Please try again.', status=502)

    tx.refresh_from_db()
    tx.provider_payment_id = str(order_id)[:120]
    tx.notes = json.dumps(
        {
            **_notes(tx),
            'orderId': order_id,
            'mode': order.get('mode'),
            'checkoutUrl': checkout_url,
            'expiresAt': order.get('expiresAt'),
            'gatewayStatus': order.get('status'),
        }
    )
    tx.save(update_fields=['provider_payment_id', 'notes', 'updated_at'])

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

    return {
        'success': True,
        'gateway': GATEWAY_CODE,
        'flow': 'redirect',
        'transactionId': tx.id,
        'orderId': order_id,
        'clientRef': client_ref,
        'checkoutUrl': checkout_url,
        'expiresAt': order.get('expiresAt'),
    }


# --- Settlement -----------------------------------------------------------


def _reverse_unapproved(tx: Transaction, reason: str) -> Transaction:
    """The gateway corrected a SUCCESS that is still awaiting admin approval."""
    tx.status = Transaction.Status.FAILED
    tx.error_message = f'Reversed by gateway: {reason}'[:500]
    tx.save(update_fields=['status', 'error_message', 'updated_at'])
    _save_notes(tx, {'paymentVerified': False})
    tx.refresh_from_db()
    logger.warning('p2ppay-reversed tx=%s before approval: %s', tx.id, reason)
    return tx


def _apply_order_state(
    tx: Transaction, data: dict, *, event: str | None = None
) -> Transaction:
    """Move a deposit to match the gateway's order. Caller holds the row lock."""
    status = str(data.get('status') or '').upper()
    if status not in ('SUCCESS', 'FAILED', 'EXPIRED'):
        return tx  # still PENDING at the gateway

    utr = str(data['utr']) if data.get('utr') else None
    reason = str(data['reason'])[:300] if data.get('reason') else None
    extra = {'gatewayStatus': status}
    if data.get('orderId'):
        extra['orderId'] = data['orderId']
    if reason:
        extra['gatewayReason'] = reason
    if utr:
        extra['utr'] = utr
    _save_notes(tx, extra)
    tx.refresh_from_db()

    if status == 'SUCCESS':
        if _amount_mismatch(data.get('amount'), tx.amount):
            logger.error(
                'p2ppay-success amount mismatch tx=%s expected=%s got=%s - left for review',
                tx.id, tx.amount, data.get('amount'),
            )
            _save_notes(tx, {'amountMismatch': str(data.get('amount'))})
            tx.refresh_from_db()
            return tx
        tx = deposit_gateway._queue_for_admin_if_needed(tx, utr=utr)
        if _cfg().get('AUTO_CREDIT') and tx.status == Transaction.Status.PENDING:
            try:
                services.confirm_deposit(tx.id, utr or tx.reference_number)
            except Exception:
                # Stays PENDING for an admin to approve by hand.
                logger.exception('p2ppay-auto-credit failed for tx %s', tx.id)
            tx.refresh_from_db()
        return tx

    # FAILED / EXPIRED
    if status == 'EXPIRED':
        message = 'Payment window expired'
    else:
        message = f'Payment not received: {reason}' if reason else 'Payment not received'

    if tx.status == Transaction.Status.COMPLETED:
        # Already credited: never claw back automatically — flag for an admin.
        _save_notes(tx, {'gatewayReversal': reason or status})
        tx.refresh_from_db()
        logger.error(
            'p2ppay-reversal AFTER credit tx=%s event=%s reason=%s - needs manual review',
            tx.id, event, reason,
        )
        return tx
    if (
        event == 'order.updated'
        and tx.status == Transaction.Status.PENDING
        and _notes(tx).get('paymentVerified')
    ):
        return _reverse_unapproved(tx, reason or status)
    return deposit_gateway._mark_failed(tx, message)


def refresh(tx: Transaction) -> Transaction:
    """Ask the gateway for an in-flight order's state (result-view polling)."""
    if tx.status != Transaction.Status.PROCESSING:
        return tx
    ref = tx.reference_number or _notes(tx).get('clientRef')
    if not ref:
        return tx
    try:
        data = p2ppay.get_order(ref)
    except P2PPayError:
        return tx
    if not isinstance(data, dict) or not _belongs(tx, data):
        return tx
    with tenant_atomic():
        locked = Transaction.objects.select_for_update().get(id=tx.id)
        if locked.status != Transaction.Status.PROCESSING:
            return locked  # the webhook got there first
        return _apply_order_state(locked, data)


# --- Webhook --------------------------------------------------------------


def _find_tx(data: dict) -> Transaction | None:
    qs = Transaction.objects.filter(
        type=Transaction.TxType.DEPOSIT, payment_method=GATEWAY_CODE
    )
    tx = None
    if data.get('clientRef'):
        tx = qs.filter(reference_number=str(data['clientRef'])).first()
    if tx is None and data.get('orderId'):
        tx = qs.filter(provider_payment_id=str(data['orderId'])).first()
    if tx is not None and not _belongs(tx, data):
        return None
    return tx


def handle_webhook(raw_body: bytes, timestamp: str, signature: str) -> int:
    """Verify and apply one P2P·PAY notice. Returns the HTTP status to answer.

    A 2xx tells P2P·PAY to stop retrying, so anything we cannot act on but
    that is genuinely theirs (unknown order, payout event, repeat) still gets
    200; only a bad signature (401) or malformed body (400) is refused.
    """
    if not p2ppay.verify_webhook(raw_body, timestamp, signature):
        logger.warning('p2ppay-webhook rejected: bad signature or stale timestamp')
        return 401
    try:
        notice = json.loads(raw_body.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        return 400
    if not isinstance(notice, dict):
        return 400

    event = str(notice.get('event') or '')
    event_id = str(notice.get('id') or '')
    data = notice.get('data') if isinstance(notice.get('data'), dict) else {}
    logger.info(
        'p2ppay-webhook id=%s event=%s order=%s ref=%s status=%s utr=%s',
        event_id or '-', event, data.get('orderId') or '-', data.get('clientRef') or '-',
        data.get('status') or '-', data.get('utr') or '-',
    )

    if not event.startswith('order.'):
        return 200  # payout.* — payouts are not used by this integration

    tx = _find_tx(data)
    if tx is None:
        logger.warning(
            'p2ppay-webhook no deposit for order=%s ref=%s',
            data.get('orderId'), data.get('clientRef'),
        )
        return 200

    with tenant_atomic():
        tx = Transaction.objects.select_for_update().get(id=tx.id)
        notes = _notes(tx)
        seen = notes.get('webhookEvents') or []
        if event_id and event_id in seen:
            return 200
        if notes.get('mode') and data.get('mode') and notes['mode'] != data['mode']:
            logger.warning(
                'p2ppay-webhook mode mismatch tx=%s expected=%s got=%s',
                tx.id, notes['mode'], data['mode'],
            )
            return 200
        tx = _apply_order_state(tx, data, event=event)
        if event_id:
            tx.refresh_from_db()
            seen = (list(_notes(tx).get('webhookEvents') or []) + [event_id])[
                -_MAX_REMEMBERED_EVENTS:
            ]
            _save_notes(tx, {'webhookEvents': seen})
    return 200
