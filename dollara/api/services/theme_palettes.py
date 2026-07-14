"""Built-in per-theme color defaults — dollara's own copy of the palette.

Branding (including colors) is authored in Super Admin and delivered over the
control plane. These defaults are the *offline* fallback: if Super Admin has
never been reached (cold cache) or set no color for a token, the product still
renders each theme with a complete, correct palette.

This mirrors ``super_admin/api/tenants/theme_palettes.py`` (default values only)
and ``dollara/web/src/themes/palettes.js`` (the web injector). Keep the three in
sync when adding or renaming a token.
"""

from __future__ import annotations

_GLASS = {
    'primary': '#F5C542',
    'accent': '#FFB800',
    'app_bg': '#0B0F14',
    'app_fg': '#FFFFFF',
    'rail': '#0B0F14',
    'panel': '#151A21',
    'panel_strong': '#0B0F14',
    'muted': '#9CA3AF',
    'hairline': '#FFFFFF',
}

DEFAULT_COLORS = {
    'theme1': dict(_GLASS),
    'theme2': dict(_GLASS),
    'theme3': {
        'primary': '#c79a3b',
        't3_bg_a': '#f4f2f9',
        't3_bg_b': '#e9e6f2',
        't3_bg_c': '#efeaf3',
        't3_ink': '#1b1726',
        't3_muted': '#6b6579',
        't3_footer': '#241b3a',
    },
    'theme4': {
        't4_teal': '#0e7480',
        't4_teal_bright': '#17a2b0',
        't4_nav': '#0a5560',
        't4_ink': '#13272b',
        't4_muted': '#5d7378',
        't4_back': '#72bbef',
        't4_lay': '#faa9ba',
        't4_live': '#e5342c',
    },
}

DEFAULT_THEME = 'theme1'


def default_colors(theme_key: str) -> dict:
    return dict(DEFAULT_COLORS.get(theme_key, DEFAULT_COLORS[DEFAULT_THEME]))
