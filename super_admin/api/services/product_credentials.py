"""Issue / rotate / look up the RSA credential securing a product's webhook channel.

Each product has at most one *active* :class:`ProductCredential`. The private key
stays in the master DB and is used by :mod:`services.webhook_client` to sign data
requests; the public key is what the product installs to verify them.
"""

from __future__ import annotations

from django.utils import timezone

from services.crypto_keys import generate_key_pair, new_key_id
from tenants.models import Product, ProductCredential


def get_active_credential(product: Product) -> ProductCredential | None:
    return (
        ProductCredential.objects.filter(product=product, is_active=True)
        .order_by('-created_at')
        .first()
    )


def issue_credential(product: Product) -> ProductCredential:
    """Create the product's first active credential. No-op-safe: if one already
    exists it is returned unchanged (use :func:`rotate_credential` to replace)."""
    existing = get_active_credential(product)
    if existing:
        return existing
    return _create_credential(product)


def rotate_credential(product: Product) -> ProductCredential:
    """Issue a fresh key pair and retire the previous active one.

    The product must install the new public key; until it does, requests signed
    with the new key will fail verification on the product side. The console
    surfaces this via ``delivered_to_product_at``.
    """
    now = timezone.now()
    ProductCredential.objects.filter(product=product, is_active=True).update(
        is_active=False, rotated_at=now
    )
    return _create_credential(product)


def _create_credential(product: Product) -> ProductCredential:
    pair = generate_key_pair()
    return ProductCredential.objects.create(
        product=product,
        key_id=new_key_id(),
        private_pem=pair.private_pem,
        public_pem=pair.public_pem,
        fingerprint=pair.fingerprint,
        is_active=True,
    )


def mark_delivered(credential: ProductCredential) -> None:
    """Record that the product confirmed installation of the public key."""
    credential.delivered_to_product_at = timezone.now()
    credential.save(update_fields=['delivered_to_product_at'])


def serialize_credential(credential: ProductCredential, *, include_private: bool = False) -> dict:
    """Public-safe view of a credential. ``private_pem`` is only included when the
    caller explicitly asks (one-time reveal right after generate/rotate)."""
    data = {
        'key_id': credential.key_id,
        'public_pem': credential.public_pem,
        'fingerprint': credential.fingerprint,
        'is_active': credential.is_active,
        'delivered_to_product_at': (
            credential.delivered_to_product_at.isoformat()
            if credential.delivered_to_product_at else None
        ),
        'last_used_at': (
            credential.last_used_at.isoformat() if credential.last_used_at else None
        ),
        'created_at': credential.created_at.isoformat(),
        'rotated_at': credential.rotated_at.isoformat() if credential.rotated_at else None,
    }
    if include_private:
        data['private_pem'] = credential.private_pem
    return data
