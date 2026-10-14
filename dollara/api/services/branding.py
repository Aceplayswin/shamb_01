"""White-label branding for the current tenant, per theme.

Branding is authored in Super Admin (one set per theme) and delivered to dollara
over the control-plane config endpoint (see :mod:`services.control_plane`) —
dollara no longer reads the master ``branding`` table directly.

Two states, as required:
  1. **Super Admin available** — colors/name/logo come from the delivered config
     (per theme), with any color a theme didn't set filled from that theme's
     built-in default.
  2. **Fallback** — if the config can't be resolved (cold cache + Super Admin
     down, or no branding present), each theme still renders on its own built-in
     default palette (:mod:`services.theme_palettes`).
"""

from __future__ import annotations

from services.control_plane import get_product_config
from services.theme_palettes import DEFAULT_THEME, default_colors


def _default_branding(theme_key: str) -> dict:
    colors = default_colors(theme_key)
    return {
        'theme_key': theme_key,
        'product_name': 'Gaming Platform',
        'logo_url': '',
        'favicon_url': '',
        'theme_color': colors.get('primary', '#ff9800'),
        'secondary_color': colors.get('accent', '#a78bfa'),
        'colors': colors,
        'splash_url': '',
        'app_icon_url': '',
        'support_email': '',
        'support_phone': '',
        'terms_url': '',
        'privacy_url': '',
        'extra': None,
    }


def _active_theme(config: dict | None) -> str:
    theme = (config or {}).get('theme') or {}
    return theme.get('active_theme') or DEFAULT_THEME


def _fill_colors(branding: dict, theme_key: str) -> dict:
    """Ensure every default color token is present (per-color fallback)."""
    merged = default_colors(theme_key)
    incoming = branding.get('colors') or {}
    for key, value in incoming.items():
        if isinstance(value, str) and value.strip():
            merged[key] = value
    out = dict(branding)
    out['colors'] = merged
    out.setdefault('theme_key', theme_key)
    return out


def get_branding(theme_key: str | None = None) -> dict:
    """Branding for a theme (default: this product's live theme), or safe defaults.

    dollara serves a single product identified by its api_key, so branding comes
    from the control-plane config — there is no tenant/slug argument.
    """
    config = get_product_config()
    if not config:
        return _default_branding(theme_key or DEFAULT_THEME)

    active = _active_theme(config)
    key = theme_key or active

    by_theme = config.get('branding_by_theme') or {}
    branding = by_theme.get(key)
    if branding is None and key == active:
        # Back-compat: older config payloads only carry the active theme's branding.
        branding = config.get('branding')
    if not branding:
        return _default_branding(key)

    return _fill_colors(branding, key)


def get_branding_by_theme() -> dict:
    """Resolved branding for every theme the product knows, keyed by theme_key."""
    config = get_product_config()
    if not config:
        return {DEFAULT_THEME: _default_branding(DEFAULT_THEME)}
    by_theme = config.get('branding_by_theme') or {}
    if not by_theme and config.get('branding'):
        active = _active_theme(config)
        by_theme = {active: config['branding']}
    return {key: _fill_colors(b, key) for key, b in by_theme.items()}
