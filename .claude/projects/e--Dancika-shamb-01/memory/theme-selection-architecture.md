---
name: theme-selection-architecture
description: How super-admin theme activation/selection flows to product frontends in the white-label platform
metadata:
  type: project
---

Per-product frontend themes: super admin activates a subset of themes per product and picks one live theme; the product FE renders the matching theme.

**How to apply:**
- Theme catalog (single source of truth for valid keys): `super_admin/api/tenants/themes.py` — `THEME_CATALOG`, `THEME_KEYS`, `DEFAULT_THEME='theme1'`, `normalize_themes(available, active)`. Adding a theme = entry here + a folder `dollara/web/src/themes/<key>/` + registry entry.
- Storage: **master DB only**. As of 2026-06-09 the source of truth is the **`product_themes` table** (model `ProductTheme` in `super_admin/api/tenants/models.py`): one row per catalog theme per product, with `is_active` (exactly one active = the live theme) and `is_enabled` flags. The old `products.available_themes`/`active_theme` JSON columns remain for back-compat but are NOT read anymore. Active model is **exactly-one-active** (activating one deactivates the rest), not the old "many enabled + one live".
- Theme-row logic lives in `tenants/themes.py`: `ensure_product_themes(product)` (idempotent seed of all catalog rows, guarantees exactly one active), `set_active_theme(product, key)`, `get_active_theme(product)`. Rows are auto-seeded on product create (in `tenant_provisioning.provision_product`) and lazily on any list/read.
- Super admin UI: `super_admin/web/src/app/products/page.jsx` → `ThemesModal` is now a **table** (rows = themes; columns Theme/Status/Actions; Activate button = make live, Disable/Enable toggle). Changes apply immediately (no Save button); modal stays open. API service fns in `super_admin/web/src/services/api.js`: `getProductThemes`, `activateProductTheme`, `setProductThemeEnabled`.
- Endpoints: `GET /api/v1/super-admin/products/<slug>/themes` (list rows), `POST .../themes/activate` ({theme_key}), `PATCH .../themes/<theme_key>/enabled` ({is_enabled}), `GET /api/v1/super-admin/themes` (catalog). `_serialize_product` now returns `themes` (array of rows) + `active_theme`; it no longer returns `available_themes`.
- Product FE reads its live theme from the super_admin **public** endpoint `GET /api/v1/public/products/<slug>/theme` (unauthenticated, keyed by tenant slug) via `dollara/web/src/services/tenant.js#fetchActiveTheme`, using `NEXT_PUBLIC_PLATFORM_API_URL` (super_admin api, port 8000).
- FE rendering: a theme is a COMPLETE UI/UX (its own shell/chrome + its own pages), not just a homepage swap. `ProductThemeProvider` (`dollara/web/src/hooks/useProductTheme.jsx`) resolves the active key app-wide. `src/themes/registry.js` maps `key -> { Shell, pages }`. `src/themes/ThemeShell.jsx` renders the active theme's shell (used once in `app/layout.jsx`, replacing the old shared AppFrame). `src/themes/ThemePage.jsx` (`<ThemePage routeKey="home">`) renders the active theme's page for a route, falling back to the default theme's page then to `children`. Route files (`app/<route>/page.jsx`) are thin dispatchers.
- EVERY player route is theme-dispatched, not just home. Each `app/<route>/page.jsx` is a thin `<ThemePage routeKey="...">` dispatcher (routeKeys: home, login, register, deposit, withdraw, profile, onboarding, support, games, play). Dynamic routes (`games/[category]`, `play/[slug]`) — the THEMED page reads `useParams()` itself; dispatchers pass no props. `not-found.jsx` stays shared (error page, not theme-dispatched).
- theme1 = original Dollara look: `themes/theme1/shell/ThemeShell.jsx` (renders `@/components/layout/Header` + `Footer` + offsets; `Footer` showCta is route-aware, hidden on /login /register /onboarding) + `themes/theme1/pages/*.jsx`. theme1 pages are the ORIGINAL route bodies with their own `<Header/>/<Footer/>` stripped (the shell provides chrome now) — do NOT re-add chrome to page bodies.
- theme2 = WAXCASINO style (matches a reference image): `themes/theme2/shell/{ThemeShell,Sidebar,TopBar,Footer}.jsx` (dark navy, left icon sidebar that expands on hover, sticky topbar w/ balance+Deposit, full footer) + a full `themes/theme2/pages/*.jsx` for ALL 9 routes. Shared WAXCASINO styling primitives in `themes/theme2/components/ui.jsx` (`t2Input`, `t2Select`, `t2BtnPrimary`, `t2BtnGhost`, `T2Card`, `T2FormPage`). theme2 uses explicit hex colors (#070d16/#0d1420 + amber) so it ignores the light/dark toggle; its Games/Play pages render their own tiles instead of the theme1-styled shared `GameCard`.
- Admin routes (`/admin/*`) are untouched: every shell early-returns children for `pathname.startsWith('/admin')`.
- Removed: `src/components/layout/AppFrame.jsx` (superseded by per-theme shells).

**Why:** The product FE already reads branding from its OWN api (dollara/api), but theme control was centralized on the master DB instead, so a new public theme endpoint on the super_admin api was added rather than threading theme through dollara/api branding.

Note: this system was originally designed then lost — only a compiled `themes.cpython-313.pyc` survived; `themes.py` was reconstructed from it. Related: [[branding-vs-theme-split]] (if written later).
