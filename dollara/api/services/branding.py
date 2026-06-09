"""White-label branding serialization for the current tenant."""

from __future__ import annotations

from django.db.utils import OperationalError, ProgrammingError

from tenants.models import Branding, Product

_MISSING_TABLE_ERRORS = (ProgrammingError, OperationalError)

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

BRANDING_FIELDS = (
    'product_name',
    'logo_url',
    'favicon_url',
    'theme_color',
    'secondary_color',
    'splash_url',
    'app_icon_url',
    'support_email',
    'support_phone',
    'terms_url',
    'privacy_url',
    'extra',
)


def default_branding_for_product(product: Product) -> dict:
    data = dict(DEFAULT_BRANDING)
    data['product_name'] = product.name
    return data


def serialize_branding(product: Product, branding: Branding | None) -> dict:
    if branding is None:
        data = default_branding_for_product(product)
    else:
        data = {field: getattr(branding, field) for field in BRANDING_FIELDS}
    data['slug'] = product.slug
    return data


def get_branding_for_product(product: Product) -> dict:
    try:
        branding = Branding.objects.filter(product=product).first()
    except _MISSING_TABLE_ERRORS:
        branding = None
    return serialize_branding(product, branding)


def get_branding_for_slug(slug: str | None) -> dict:
    if not slug:
        return dict(DEFAULT_BRANDING)
    try:
        product = Product.objects.filter(slug=slug).first()
    except _MISSING_TABLE_ERRORS:
        product = None
    if not product:
        return dict(DEFAULT_BRANDING)
    return get_branding_for_product(product)
