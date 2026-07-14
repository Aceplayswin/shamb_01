"""White-label branding serialization for products, per theme.

Branding is authored per ``(product, theme_key)``. Each theme carries its own
identity (name, asset URLs, support/legal links) and a full color palette. Colors
a theme doesn't explicitly set fall back to that theme's defaults declared in
:mod:`tenants.theme_palettes` — so a serialized branding is always complete.
"""

from __future__ import annotations

from tenants.models import Branding, Product
from tenants.theme_palettes import (
    IDENTITY_DEFAULTS,
    default_colors,
    resolve_colors,
)
from tenants.themes import DEFAULT_THEME, THEME_KEYS

# Identity + legacy flat color fields stored as columns on the branding row.
IDENTITY_FIELDS = (
    'product_name',
    'logo_url',
    'favicon_url',
    'splash_url',
    'app_icon_url',
    'support_email',
    'support_phone',
    'terms_url',
    'privacy_url',
    'extra',
)

# Full serialized shape (identity + flat brand colors + the colors palette map).
BRANDING_FIELDS = IDENTITY_FIELDS + ('theme_color', 'secondary_color')


def default_branding_for_theme(product: Product, theme_key: str) -> dict:
    """Complete default branding for a product/theme (no stored row)."""
    colors = default_colors(theme_key)
    data = dict(IDENTITY_DEFAULTS)
    data['product_name'] = product.name
    data['extra'] = None
    data['theme_key'] = theme_key
    data['colors'] = colors
    data['theme_color'] = colors.get('primary', '#ff9800')
    data['secondary_color'] = colors.get('accent', '#a78bfa')
    return data


def serialize_branding(product: Product, theme_key: str, branding: Branding | None) -> dict:
    """Serialize a theme's branding, merging stored overrides over theme defaults."""
    if branding is None:
        return default_branding_for_theme(product, theme_key)

    colors = resolve_colors(theme_key, branding.colors)
    data = {field: getattr(branding, field) for field in IDENTITY_FIELDS}
    data['theme_key'] = theme_key
    data['colors'] = colors
    # Keep the flat brand colors in sync with the palette for legacy readers.
    data['theme_color'] = colors.get('primary', branding.theme_color)
    data['secondary_color'] = colors.get('accent', branding.secondary_color)
    return data


def get_branding_for_product(product: Product, theme_key: str) -> dict:
    branding = Branding.objects.filter(product=product, theme_key=theme_key).first()
    return serialize_branding(product, theme_key, branding)


def get_all_theme_branding(product: Product) -> dict:
    """Resolved branding for every catalog theme, keyed by theme_key."""
    rows = {b.theme_key: b for b in Branding.objects.filter(product=product)}
    return {
        key: serialize_branding(product, key, rows.get(key))
        for key in THEME_KEYS
    }


def ensure_branding(product: Product, theme_key: str = DEFAULT_THEME,
                    *, product_name: str | None = None) -> Branding:
    """Create a branding row (theme defaults) if missing. Idempotent."""
    defaults = {field: IDENTITY_DEFAULTS[field] for field in IDENTITY_FIELDS
                if field in IDENTITY_DEFAULTS}
    colors = default_colors(theme_key)
    defaults['product_name'] = product_name or product.name
    defaults['colors'] = colors
    defaults['theme_color'] = colors.get('primary', '#ff9800')
    defaults['secondary_color'] = colors.get('accent', '#a78bfa')
    branding, _ = Branding.objects.update_or_create(
        product=product, theme_key=theme_key, defaults=defaults,
    )
    return branding
