"""Per-theme color palettes — the single source of truth for which colors each
theme exposes and their built-in defaults.

Branding is authored per theme (see the ``Branding`` model, one row per
``(product, theme_key)``). Each theme declares its own set of color *tokens*;
Super Admin lets an operator override any subset of them. Anything not overridden
falls back to the default declared here — so a theme always renders with a
complete palette even when Super Admin sets nothing (or is unreachable and the
product frontend uses its own baked-in copy of these same defaults).

The token keys here are mirrored on the product side:
  * ``dollara/web/src/themes/palettes.js`` (how each token maps to a CSS variable)
  * ``dollara/api/services/branding.py`` (default colors for the offline state)

Adding/renaming a token is a coordinated change across those three places.

Each token: ``{key, label, group, default}``.
  * ``key``   — stable identifier stored in ``Branding.colors``.
  * ``label`` — human label shown in the Super Admin color editor.
  * ``group`` — editor section heading.
  * ``default`` — the theme's own default color (hex).
"""

from __future__ import annotations

# theme1 & theme2 render on the shared dark "glass" palette driven by the global
# :root tokens in dollara/web/src/app/globals.css, plus the amber brand ramp.
_GLASS_TOKENS = [
    {'key': 'primary', 'label': 'Primary / Brand', 'group': 'Brand', 'default': '#F5C542'},
    {'key': 'accent', 'label': 'Accent / Secondary', 'group': 'Brand', 'default': '#FFB800'},
    {'key': 'app_bg', 'label': 'Page Background', 'group': 'Surfaces', 'default': '#0B0F14'},
    {'key': 'app_fg', 'label': 'Primary Text', 'group': 'Surfaces', 'default': '#FFFFFF'},
    {'key': 'rail', 'label': 'Nav / Rail', 'group': 'Surfaces', 'default': '#0B0F14'},
    {'key': 'panel', 'label': 'Card / Panel', 'group': 'Surfaces', 'default': '#151A21'},
    {'key': 'panel_strong', 'label': 'Strong Panel', 'group': 'Surfaces', 'default': '#0B0F14'},
    {'key': 'muted', 'label': 'Muted Text', 'group': 'Surfaces', 'default': '#9CA3AF'},
    {'key': 'hairline', 'label': 'Borders / Hairline', 'group': 'Surfaces', 'default': '#FFFFFF'},
]

THEME_PALETTES = {
    'theme1': {'colors': list(_GLASS_TOKENS)},
    'theme2': {'colors': list(_GLASS_TOKENS)},
    # theme3 (Velocity) — light cream lobby, scoped .theme3-root vars.
    'theme3': {
        'colors': [
            {'key': 'primary', 'label': 'Primary / Gold', 'group': 'Brand', 'default': '#c79a3b'},
            {'key': 't3_bg_a', 'label': 'Background (top)', 'group': 'Surfaces', 'default': '#f4f2f9'},
            {'key': 't3_bg_b', 'label': 'Background (mid)', 'group': 'Surfaces', 'default': '#e9e6f2'},
            {'key': 't3_bg_c', 'label': 'Background (bottom)', 'group': 'Surfaces', 'default': '#efeaf3'},
            {'key': 't3_ink', 'label': 'Primary Text', 'group': 'Surfaces', 'default': '#1b1726'},
            {'key': 't3_muted', 'label': 'Muted Text', 'group': 'Surfaces', 'default': '#6b6579'},
            {'key': 't3_footer', 'label': 'Footer', 'group': 'Surfaces', 'default': '#241b3a'},
        ],
    },
    # theme4 (Exchange) — teal sports-exchange lobby, scoped .theme4-root vars.
    'theme4': {
        'colors': [
            {'key': 't4_teal', 'label': 'Header Teal', 'group': 'Brand', 'default': '#0e7480'},
            {'key': 't4_teal_bright', 'label': 'Header Teal (bright)', 'group': 'Brand', 'default': '#17a2b0'},
            {'key': 't4_nav', 'label': 'Nav Strip', 'group': 'Brand', 'default': '#0a5560'},
            {'key': 't4_ink', 'label': 'Primary Text', 'group': 'Surfaces', 'default': '#13272b'},
            {'key': 't4_muted', 'label': 'Muted Text', 'group': 'Surfaces', 'default': '#5d7378'},
            {'key': 't4_back', 'label': 'Back Odds (blue)', 'group': 'Odds', 'default': '#72bbef'},
            {'key': 't4_lay', 'label': 'Lay Odds (pink)', 'group': 'Odds', 'default': '#faa9ba'},
            {'key': 't4_live', 'label': 'Live / Alert', 'group': 'Odds', 'default': '#e5342c'},
        ],
    },
}


# Shared white-label identity defaults (same tokens for every theme; product_name
# defaults to the product's own name at serialization time).
IDENTITY_DEFAULTS = {
    'product_name': 'Gaming Platform',
    'logo_url': '',
    'favicon_url': '',
    'splash_url': '',
    'app_icon_url': '',
    'support_email': '',
    'support_phone': '',
    'terms_url': '',
    'privacy_url': '',
}


def palette_for(theme_key: str) -> dict:
    """The color-token catalog for a theme (falls back to theme1's glass set)."""
    return THEME_PALETTES.get(theme_key, THEME_PALETTES['theme1'])


def color_tokens(theme_key: str) -> list[dict]:
    return list(palette_for(theme_key)['colors'])


def default_colors(theme_key: str) -> dict:
    """``{token_key: default_hex}`` for a theme."""
    return {t['key']: t['default'] for t in color_tokens(theme_key)}


def resolve_colors(theme_key: str, overrides: dict | None) -> dict:
    """Theme defaults overlaid with any Super Admin overrides (per color).

    Unknown keys in ``overrides`` are ignored so a stale/mismatched override can
    never leak a token the theme doesn't declare.
    """
    resolved = default_colors(theme_key)
    if overrides:
        for key in resolved:
            value = overrides.get(key)
            if isinstance(value, str) and value.strip():
                resolved[key] = value.strip()
    return resolved
