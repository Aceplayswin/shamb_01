"""Resolve the affiliate public key that signs an inbound partner request.

The mirror image of :mod:`services.super_admin_keys`, and deliberately a
separate module: Super Admin keys arrive over the control plane and identify
*this product*, whereas affiliate keys are issued by this product and identify
*one partner*. Sharing a resolver between the two would be the single easiest
way for an affiliate key to end up trusted on a Super Admin route.

Keys live in ``affiliate_api_keys``. Only the public half is ever stored — the
private half is handed to the affiliate once, at generation.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.utils import timezone

from core.affiliate_models import AffiliateApiKey


@dataclass(frozen=True)
class AffiliateKey:
    """The verified identity behind a signed affiliate request."""

    key_id: str
    affiliate_id: int
    public_pem: str
    status: str


def resolve_affiliate_key(key_id: str) -> AffiliateKey | None:
    """Return the :class:`AffiliateKey` for ``key_id``, or ``None`` if it cannot
    sign right now.

    Status handling is the whole point of this function:

    * ``active``   — verifies.
    * ``rotating`` — verifies until ``grace_until`` passes, so a partner's
      in-flight requests survive a key rotation instead of failing mid-deploy.
    * ``revoked``  — never verifies, effective on the next request rather than
      the next deploy (there is no caching layer in front of this lookup).
    """
    if not key_id:
        return None

    row = AffiliateApiKey.objects.filter(key_id=key_id).first()
    if not row:
        return None

    if row.status == AffiliateApiKey.Status.REVOKED:
        return None
    if row.status == AffiliateApiKey.Status.ROTATING:
        if not row.grace_until or row.grace_until <= timezone.now():
            return None

    return AffiliateKey(
        key_id=row.key_id,
        affiliate_id=row.affiliate_id,
        public_pem=row.public_pem,
        status=row.status,
    )
