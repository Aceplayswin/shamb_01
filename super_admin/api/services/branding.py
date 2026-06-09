"""White-label branding serialization for products."""

from __future__ import annotations

from tenants.models import Branding, Product

DEFAULT_BRANDING = {
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
    branding = Branding.objects.filter(product=product).first()
    return serialize_branding(product, branding)


def get_branding_for_slug(slug: str | None) -> dict:
    if not slug:
        return dict(DEFAULT_BRANDING)
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return dict(DEFAULT_BRANDING)
    return get_branding_for_product(product)


def ensure_branding(product: Product, *, product_name: str | None = None) -> Branding:
    """Create branding row with defaults if missing. Idempotent."""
    defaults = default_branding_for_product(product)
    if product_name:
        defaults['product_name'] = product_name
    branding, _ = Branding.objects.update_or_create(
        product=product,
        defaults=defaults,
    )
    return branding
