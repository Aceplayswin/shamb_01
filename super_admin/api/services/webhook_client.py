"""Super Admin -> Product signed-webhook client (the PULL data plane).

Instead of Super Admin opening a MySQL connection to a product's database, it
sends an HTTP request to the product's data webhook, signed with the product's
private key. The product verifies the signature with its public key and returns
JSON. The product is the only process that ever touches its own database.

Wire contract (mirrors :mod:`services.crypto_keys`):

    GET  {be_url}/api/v1/webhooks/super-admin/data/{resource}?{query}
    Headers:
        X-SA-Product:   <product slug>
        X-SA-Key-Id:    <credential.key_id>
        X-SA-Timestamp: <unix seconds>
        X-SA-Nonce:     <random hex>
        X-SA-Signature: base64(RSA-PSS/SHA256(canonical-string))

The canonical string is built by ``crypto_keys.build_signing_string`` from the
method, path, key id, timestamp, nonce and a SHA-256 of the body. The product
must reconstruct the same path it received (``WEBHOOK_BASE_PATH`` + resource +
query) — see the Phase 2 spec.
"""

from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

from django.utils import timezone

from services.crypto_keys import (
    HEADER_KEY_ID, HEADER_NONCE, HEADER_PRODUCT, HEADER_SIGNATURE, HEADER_TIMESTAMP,
    new_nonce, sign_request,
)
from services.product_credentials import get_active_credential
from tenants.models import Product, ProductCredential, Url, WebhookDelivery

# Path prefix the product exposes for Super Admin data pulls. The product mounts
# its verifying endpoint at this prefix; both sides must agree on it because it is
# part of the signed canonical string.
WEBHOOK_BASE_PATH = '/api/v1/webhooks/super-admin'

_REQUEST_TIMEOUT = 15

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


class WebhookError(RuntimeError):
    """Raised when a product webhook call fails (network, auth, or product error).

    ``http_status`` is the product's HTTP status when there was a response.
    """

    def __init__(self, message: str, *, http_status: int | None = None):
        super().__init__(message)
        self.http_status = http_status


def _resource_path(resource: str) -> str:
    # resource like "data.summary" -> ".../data/summary"; "data.users" -> ".../data/users"
    return WEBHOOK_BASE_PATH + '/' + resource.replace('.', '/')


def _product_base_url(product: Product) -> str:
    url = Url.objects.filter(product=product).first()
    be_url = (url.be_url if url else '').strip().rstrip('/')
    if not be_url:
        raise WebhookError(
            f"Product '{product.slug}' has no backend URL configured; set its be_url first."
        )
    return be_url


def call_product(
    product: Product,
    resource: str,
    *,
    method: str = 'GET',
    query: dict | None = None,
    body: dict | None = None,
) -> dict:
    """Send a signed request to ``product``'s webhook and return the JSON response.

    Records a :class:`WebhookDelivery` audit row for every attempt. Raises
    :class:`WebhookError` on any failure (caller maps that to an HTTP status).
    """
    credential = get_active_credential(product)
    if not credential:
        raise WebhookError(
            f"Product '{product.slug}' has no active webhook credential; "
            f"generate one before pulling data."
        )

    base_url = _product_base_url(product)
    path = _resource_path(resource)
    query_string = urllib.parse.urlencode(query or {}, doseq=True)
    full_path = f'{path}?{query_string}' if query_string else path
    url = base_url + full_path

    raw_body = json.dumps(body).encode() if body is not None else None
    timestamp = str(int(time.time()))
    nonce = new_nonce()
    signature = sign_request(
        credential.private_pem,
        method=method,
        path=full_path,
        key_id=credential.key_id,
        timestamp=timestamp,
        nonce=nonce,
        body=raw_body,
    )

    delivery = WebhookDelivery.objects.create(
        product=product,
        credential=credential,
        resource=resource,
        request_method=method,
        request_path=full_path,
        nonce=nonce,
        status=WebhookDelivery.Status.PENDING,
    )

    started = time.monotonic()
    try:
        req = urllib.request.Request(url, data=raw_body, method=method)
        req.add_header('User-Agent', 'SuperAdmin-Webhook/1.0')
        req.add_header('Accept', 'application/json')
        if raw_body is not None:
            req.add_header('Content-Type', 'application/json')
        req.add_header(HEADER_PRODUCT, product.slug)
        req.add_header(HEADER_KEY_ID, credential.key_id)
        req.add_header(HEADER_TIMESTAMP, timestamp)
        req.add_header(HEADER_NONCE, nonce)
        req.add_header(HEADER_SIGNATURE, signature)

        with urllib.request.urlopen(req, timeout=_REQUEST_TIMEOUT, context=_SSL_CTX) as resp:
            payload = resp.read()
            http_status = resp.status
        data = json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        detail = _extract_error(e)
        _finish(delivery, started, WebhookDelivery.Status.FAILED, e.code, detail)
        raise WebhookError(
            f'Product webhook returned HTTP {e.code}: {detail}', http_status=e.code
        )
    except urllib.error.URLError as e:
        _finish(delivery, started, WebhookDelivery.Status.FAILED, None, str(e.reason))
        raise WebhookError(f'Could not reach product webhook: {e.reason}')
    except (json.JSONDecodeError, ValueError) as e:
        _finish(delivery, started, WebhookDelivery.Status.FAILED, http_status, str(e))
        raise WebhookError(f'Invalid JSON from product webhook: {e}')

    _finish(delivery, started, WebhookDelivery.Status.SUCCESS, http_status, None)
    credential.last_used_at = timezone.now()
    credential.save(update_fields=['last_used_at'])
    return data


def _extract_error(e: urllib.error.HTTPError) -> str:
    try:
        body = json.loads(e.read())
        return str(body.get('error') or body.get('detail') or e.reason)
    except Exception:
        return str(e.reason)


def _finish(delivery: WebhookDelivery, started: float, status, http_status, error) -> None:
    delivery.status = status
    delivery.http_status = http_status
    delivery.duration_ms = int((time.monotonic() - started) * 1000)
    delivery.error = error
    delivery.save(update_fields=['status', 'http_status', 'duration_ms', 'error'])
