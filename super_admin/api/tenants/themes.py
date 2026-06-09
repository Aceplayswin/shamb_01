"""Catalog of frontend themes a product can render.

This is the single source of truth for which theme keys exist. Per-product theme
selection is stored in the ``ProductTheme`` table (one row per theme, exactly one
active). The super admin activates one theme as live; product frontends read the
active theme from the public theme endpoint and render the matching theme.

Adding a new theme is a code change here plus the corresponding frontend folder
under ``<product>/web/src/themes/<key>`` — every product picks up a new row for it
automatically via ``ensure_product_themes``.
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


def ensure_product_themes(product):
    """Make sure a product has one ProductTheme row per catalog theme, and that
    exactly one of them is active. Idempotent — safe to call repeatedly (e.g. on
    product create, on list, and after adding a new catalog theme).

    Returns the active theme key.
    """
    # Imported here to avoid a circular import at module load.
    from tenants.models import ProductTheme

    existing = {t.theme_key: t for t in product.themes.all()}

    # Add a row for any catalog theme this product is missing.
    for key in THEME_KEYS:
        if key not in existing:
            existing[key] = ProductTheme.objects.create(
                product=product, theme_key=key, is_active=False, is_enabled=True,
            )

    # Drop rows for themes no longer in the catalog (keep the table clean).
    for key, row in list(existing.items()):
        if key not in THEME_KEYS:
            row.delete()
            del existing[key]

    # Enforce exactly one active row.
    active_rows = [t for t in existing.values() if t.is_active]
    if len(active_rows) == 1:
        return active_rows[0].theme_key

    if len(active_rows) > 1:
        # Keep the first (by catalog order), deactivate the rest.
        keep = None
        for key in THEME_KEYS:
            if existing.get(key) and existing[key].is_active:
                keep = key
                break
        for key, row in existing.items():
            should = key == keep
            if row.is_active != should:
                row.is_active = should
                row.save(update_fields=['is_active', 'updated_at'])
        return keep

    # No active row → activate the default (or first catalog theme present).
    default_key = DEFAULT_THEME if DEFAULT_THEME in existing else THEME_KEYS[0]
    row = existing[default_key]
    row.is_active = True
    row.save(update_fields=['is_active', 'updated_at'])
    return default_key


def set_active_theme(product, theme_key):
    """Activate exactly one theme for a product; deactivate all others.

    Raises ``ValueError`` if the key is unknown or the (existing) row is disabled.
    """
    from tenants.models import ProductTheme

    if theme_key not in THEME_KEYS:
        raise ValueError(f'Unknown theme: {theme_key}')

    ensure_product_themes(product)

    rows = {t.theme_key: t for t in product.themes.all()}
    target = rows.get(theme_key)
    if target is None:
        target = ProductTheme.objects.create(
            product=product, theme_key=theme_key, is_active=False, is_enabled=True,
        )
        rows[theme_key] = target
    if not target.is_enabled:
        raise ValueError('Cannot activate a disabled theme')

    for key, row in rows.items():
        should = key == theme_key
        if row.is_active != should:
            row.is_active = should
            row.save(update_fields=['is_active', 'updated_at'])
    return theme_key


def get_active_theme(product):
    """The product's live theme key (ensuring rows exist first)."""
    return ensure_product_themes(product)
