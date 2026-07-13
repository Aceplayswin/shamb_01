"""Resolve the Super Admin public key that signs an inbound webhook data pull.

Given the ``X-SA-Key-Id`` on a request, find the public key to verify it against
(and which product/tenant the request is for).

Primary source: the control-plane config Super Admin delivers over HTTP (see
:mod:`services.control_plane`) — the ``credentials`` list for this product carries
the public half of every issued key. Because it is fetched live (and cached
briefly), a key rotation in the Super Admin console is honoured with no redeploy.

Fallback: deployments that cannot reach the config endpoint can pin a single key
via env vars::

    SUPER_ADMIN_WEBHOOK_KEY_ID=sak_...
    SUPER_ADMIN_WEBHOOK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
    SUPER_ADMIN_WEBHOOK_PRODUCT=dollara        # optional; else taken from X-SA-Product
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from services.control_plane import get_product_config


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

    # This instance serves a single product (identified by api_key); its config
    # carries the public half of every issued key.
    config = get_product_config()
    if not config:
        return None
    product_slug = (config.get('product') or {}).get('slug')
    for cred in config.get('credentials', []):
        if cred.get('key_id') == key_id and cred.get('public_pem'):
            return SuperAdminKey(public_pem=cred['public_pem'], product_slug=product_slug)
    return None
