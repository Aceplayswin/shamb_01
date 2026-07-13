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


def get_branding_for_slug(slug: str | None = None) -> dict:
    """Branding for this product, or safe defaults when it can't be resolved.

    dollara serves a single product identified by its api_key, so branding comes
    from the control-plane config; the ``slug`` argument is accepted only for
    backward compatibility and is not used to select the product.
    """
    config = get_product_config()
    if not config or not config.get('branding'):
        return dict(DEFAULT_BRANDING)
    return config['branding']
