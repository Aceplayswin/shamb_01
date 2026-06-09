"""Catalog of frontend themes a product can render.

This is the single source of truth for which theme keys exist. The super admin
activates a subset per product (``Product.available_themes``) and picks exactly
one of those as the live theme (``Product.active_theme``). Product frontends read
the active theme from the public branding endpoint and render the matching theme.

Adding a new theme is a code change here plus the corresponding frontend folder
under ``<product>/web/src/themes/<key>`` — no schema change required.
"""

THEME_CATALOG = [
    {
        'key': 'theme1',
        'name': 'Theme 1 — Classic',
        'description': 'The original Dollara layout.',
    },
    {
        'key': 'theme2',
        'name': 'Theme 2 — Aurora',
        'description': 'Alternative hero-led layout.',
    },
]

THEME_KEYS = [t['key'] for t in THEME_CATALOG]

DEFAULT_THEME = 'theme1'


def normalize_themes(available_themes, active_theme):
    """Validate/clean an (available_themes, active_theme) pair against the catalog.

    Returns a ``(available, active)`` tuple guaranteed to be self-consistent:
    available is a deduped subset of the catalog (never empty), and active is one
    of available. Raises ``ValueError`` on unknown keys.
    """
    if available_themes is None:
        available = [DEFAULT_THEME]
    else:
        if not isinstance(available_themes, (list, tuple)):
            raise ValueError('available_themes must be a list of theme keys')
        available = []
        for key in available_themes:
            if key not in THEME_KEYS:
                raise ValueError(f'Unknown theme: {key}')
            if key not in available:
                available.append(key)
        if not available:
            available = [DEFAULT_THEME]

    if active_theme is None:
        active = available[0]
    else:
        if active_theme not in THEME_KEYS:
            raise ValueError(f'Unknown theme: {active_theme}')
        if active_theme not in available:
            raise ValueError('active_theme must be one of available_themes')
        active = active_theme

    return available, active
