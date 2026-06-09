"""White-label branding serialization for the current tenant."""

from __future__ import annotations

from django.db.utils import OperationalError, ProgrammingError

from tenants.models import Branding, Product

# The optional `branding` control-plane table is absent in single-tenant
# deployments; fall back to defaults instead of raising a 500.
_MISSING_TABLE_ERRORS = (ProgrammingError, OperationalError)

# Neutral fallback so the apps never hard-fail and never hardcode a brand name.
DEFAULT_BRANDING = {
    'slug': None,
    'product_name': 'Gaming Platform',
    'logo_url': '',
    'favicon_url': '',
    'theme_color': '#ff9800',
    'secondary_color': '#a78bfa',
    'splash_url': '',
    'app_icon_url': '',
    'support_email': '',
    'support_phone': '',
    'terms_url': '',
    'privacy_url': '',
    'extra': None,
}


def serialize_branding(product: Product, branding: Branding | None) -> dict:
    if branding is None:
        data = dict(DEFAULT_BRANDING)
        data['slug'] = product.slug
        data['product_name'] = product.name
        return data
    return {
        'slug': product.slug,
        'product_name': branding.product_name,
        'logo_url': branding.logo_url,
        'favicon_url': branding.favicon_url,
        'theme_color': branding.theme_color,
        'secondary_color': branding.secondary_color,
        'splash_url': branding.splash_url,
        'app_icon_url': branding.app_icon_url,
        'support_email': branding.support_email,
        'support_phone': branding.support_phone,
        'terms_url': branding.terms_url,
        'privacy_url': branding.privacy_url,
        'extra': branding.extra,
    }


def get_branding_for_slug(slug: str | None) -> dict:
    if not slug:
        return dict(DEFAULT_BRANDING)
    try:
        product = Product.objects.filter(slug=slug).first()
    except _MISSING_TABLE_ERRORS:
        product = None
    if not product:
        return dict(DEFAULT_BRANDING)
    try:
        branding = Branding.objects.filter(product=product).first()
    except _MISSING_TABLE_ERRORS:
        branding = None
    return serialize_branding(product, branding)
