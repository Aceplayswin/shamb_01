"""Resolve the Super Admin public key that signs an inbound webhook data pull.

Given the ``X-SA-Key-Id`` on a request, find the public key to verify it against
(and which product/tenant the request is for).

Primary source: the shared control-plane ``product_credentials`` table — the same
master DB Super Admin writes to (see ``super_admin/api/database/master.sql`` and
``tenants.models.ProductCredential``). Reading it live means a key rotation in the
Super Admin console is honoured immediately, with no redeploy.

Fallback: deployments where dollara does NOT share Super Admin's master DB can pin
a single key via env vars::

    SUPER_ADMIN_WEBHOOK_KEY_ID=sak_...
    SUPER_ADMIN_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
    SUPER_ADMIN_WEBHOOK_PRODUCT=dollara        # optional; else taken from X-SA-Product
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from tenants.models import ProductCredential


@dataclass(frozen=True)
class SuperAdminKey:
    """The public key for a request plus the product slug it is bound to.

    ``product_slug`` is ``None`` only for an env-pinned key that did not set
    ``SUPER_ADMIN_WEBHOOK_PRODUCT`` — the caller then falls back to the
    ``X-SA-Product`` header to choose the tenant.
    """

    public_pem: str
    product_slug: str | None


def _env_key(key_id: str) -> SuperAdminKey | None:
    env_key_id = os.getenv('SUPER_ADMIN_WEBHOOK_KEY_ID')
    env_pub = os.getenv('SUPER_ADMIN_WEBHOOK_PUBLIC_KEY')
    if not (env_key_id and env_pub) or key_id != env_key_id:
        return None
    # Allow PEMs supplied with literal "\n" escapes (common in .env files).
    public_pem = env_pub.replace('\\n', '\n')
    return SuperAdminKey(
        public_pem=public_pem,
        product_slug=os.getenv('SUPER_ADMIN_WEBHOOK_PRODUCT') or None,
    )


def resolve_signing_key(key_id: str) -> SuperAdminKey | None:
    """Return the :class:`SuperAdminKey` for ``key_id``, or ``None`` if unknown."""
    if not key_id:
        return None

    pinned = _env_key(key_id)
    if pinned:
        return pinned

    cred = (
        ProductCredential.objects.select_related('product')
        .filter(key_id=key_id)
        .order_by('-created_at')
        .first()
    )
    if not cred:
        return None
    return SuperAdminKey(public_pem=cred.public_pem, product_slug=cred.product.slug)
