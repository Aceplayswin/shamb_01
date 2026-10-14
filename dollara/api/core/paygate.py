"""Signed HTTP client for the Paygate public payment API.

Merchant identity is the API key pair: every mutating request is HMAC-SHA256
signed so the platform can route the order to that merchant's Razorpay account.
The browser never sees these keys — deposit checkout fetches the per-order
Razorpay payload server-side and hands only that payload to the widget.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import quote

import requests
from django.conf import settings


class PaygateError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def _cfg() -> dict:
    return getattr(settings, 'PAYGATE', {}) or {}


def api_url() -> str:
    return str(_cfg().get('API_URL') or 'http://localhost:3000').rstrip('/')


def provider() -> str:
    return str(_cfg().get('PROVIDER') or 'razorpay')


def _keys() -> tuple[str, str]:
    key_id = str(_cfg().get('KEY_ID') or '').strip()
    secret = str(_cfg().get('KEY_SECRET') or '').strip()
    if not key_id or not secret:
        raise PaygateError(
            'Payment gateway is not configured. Set PAYGATE_KEY_ID and PAYGATE_KEY_SECRET.',
            status=503,
        )
    return key_id, secret


def _signed_headers(raw_body: str = '') -> dict:
    key_id, secret = _keys()
    timestamp = str(int(time.time()))
    signature = hmac.new(
        secret.encode('utf-8'),
        f'{timestamp}.{raw_body}'.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    return {
        'Content-Type': 'application/json',
        'X-Api-Key': key_id,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
    }


def _unwrap(resp: requests.Response) -> dict:
    try:
        payload = resp.json()
    except ValueError:
        payload = {}
    if not resp.ok:
        message = (
            (payload.get('message') if isinstance(payload, dict) else None)
            or (payload.get('error') if isinstance(payload, dict) else None)
            or resp.reason
            or 'Payment gateway request failed.'
        )
        raise PaygateError(str(message), status=resp.status_code or 502)
    data = payload.get('data') if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else (payload if isinstance(payload, dict) else {})


def _request(method: str, path: str, raw_body: str | None = None, signed: bool = True) -> dict:
    url = path if path.startswith('http') else f'{api_url()}{path}'
    headers = _signed_headers(raw_body or '') if signed else {'Content-Type': 'application/json'}
    timeout = int(_cfg().get('HTTP_TIMEOUT') or 30)
    try:
        resp = requests.request(
            method,
            url,
            data=raw_body.encode('utf-8') if raw_body else None,
            headers=headers,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        raise PaygateError(f'Could not reach the payment gateway: {exc}', status=502) from exc
    return _unwrap(resp)


def initiate_payment(
    *,
    customer_name: str,
    customer_phone: str,
    amount,
    order_id: str,
    redirect_url: str,
    remark1: str = 'Wallet deposit',
) -> dict:
    amount_num = float(amount)
    if amount_num.is_integer():
        amount_num = int(amount_num)
    raw_body = json.dumps(
        {
            'amount': amount_num,
            'currency': 'INR',
            'customerName': customer_name,
            'customerPhone': customer_phone,
            'orderId': order_id,
            'redirectUrl': redirect_url,
            'remark1': remark1,
        },
        separators=(',', ':'),
    )
    return _request('POST', '/api/v1/payment/orders', raw_body=raw_body)


def fetch_checkout(payment_url: str) -> dict:
    path = payment_url if payment_url.startswith('http') else payment_url
    return _request('GET', path, signed=False)


def verify_payment(
    *,
    byte_transaction_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict:
    raw_body = json.dumps(
        {
            'byteTransactionId': byte_transaction_id,
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        },
        separators=(',', ':'),
    )
    return _request(
        'POST',
        f'/api/payments/{provider()}/payment-verify',
        raw_body=raw_body,
        signed=False,
    )


def get_order_status(merchant_order_id: str) -> dict:
    encoded = quote(str(merchant_order_id), safe='')
    return _request('GET', f'/api/v1/payment/orders/{encoded}', raw_body='')
