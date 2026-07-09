"""White-label branding for the current tenant.

Branding is authored in Super Admin and delivered to dollara over the
control-plane config endpoint (see :mod:`services.control_plane`) — dollara no
longer reads the master ``branding`` table directly.
"""

from __future__ import annotations

from services.control_plane import get_product_config

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


def get_branding_for_slug(slug: str | None) -> dict:
    """Branding for a product slug, or safe defaults when it can't be resolved."""
    if not slug:
        return dict(DEFAULT_BRANDING)
    config = get_product_config(slug)
    if not config or not config.get('branding'):
        return dict(DEFAULT_BRANDING)
    return config['branding']
