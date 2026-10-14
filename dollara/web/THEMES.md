# Themes

A theme is a **complete UI/UX**: its own shell (header / sidebar / footer / layout
offsets) and its own version of every page. Data fetching, auth and the API live
*above* the theme layer (`src/services/`, `src/hooks/`, `src/store/`) and are shared
by all of them — switching themes changes rendering only.

## Anatomy

Everything a theme is lives in one folder:

```
src/themes/theme1/
├── index.js        ← manifest: the theme's key, its Shell, and its pages by route key
├── theme.css       ← optional, theme-scoped CSS (only if the theme needs it)
├── shell/          ← chrome: ThemeShell + its header/sidebar/footer/modals
└── pages/          ← this theme's version of each route
```

`index.js` is the only file the rest of the app looks at:

```js
import Shell from './shell/ThemeShell';
import Home from './pages/Home';
// …

export default {
  key: 'theme1',
  pages: { home: Home, /* … keyed by ROUTE KEY */ },
  Shell,
};
```

Route keys are what each `src/app/<route>/page.jsx` passes to
`<ThemePage routeKey="…">` — `home`, `login`, `register`, `deposit`, `withdraw`,
`wallet`, `profile`, `settings`, `betHistory`, `promotions`, `bonus`, `appDownload`,
`refer`, `rules`, `onboarding`, `games`, `play`, `support`.

## Themes are discovered, not listed

`src/themes/registry.js` scans for `src/themes/*/index.js` at build time. There is no
hardcoded list of themes anywhere in the app, which is what makes a single-theme
build possible: **delete the theme folders you don't ship and everything still
builds** — no import to fix, no config to edit.

The active theme comes from the product API (`/api/v1/theme`, chosen in Super Admin)
and is always clamped to a theme this build actually bundles (`resolveThemeKey`), so
a single-theme build keeps rendering its own theme even if the platform points at a
theme that wasn't shipped.

## Ship one theme

```bash
npm run extract-theme -- theme1                    # → ../../../dollara-web-theme1
npm run extract-theme -- theme3 ~/builds/acme-web  # explicit destination
npm run extract-theme -- theme3 ~/builds/acme-web --force   # overwrite a non-empty dir
```

The script copies the app, keeps only the chosen theme under `src/themes/`, writes a
`THEME` marker file, and reports which routes that theme implements. Then:

```bash
cd <destination> && npm install && npm run dev
```

`node_modules`, `.next`, `.git` and other build output are not copied. Local `.env`
files **are** copied so the copy talks to the same API — review them before handing
the copy to anyone.

### Routes a theme doesn't implement

In a full build, a missing page falls back to theme1's. In a single-theme build there
is nothing to fall back to, so the route renders a neutral "This page isn't available"
notice instead of a blank screen — the build and every other route are unaffected.
`extract-theme` lists those routes up front; today only theme1 covers the account
routes (`settings`, `betHistory`, `promotions`, `bonus`, `appDownload`, `refer`,
`rules`) and only theme2–5 implement `support`.

## Add a theme

1. `mkdir src/themes/theme6` with `shell/ThemeShell.jsx` and `pages/`.
2. Add `index.js` exporting `{ key, pages, Shell }` (copy `theme1/index.js` as a model).
3. Theme-only CSS goes in `src/themes/theme6/theme.css` and is imported at the top of
   `index.js` — never in `src/app/globals.css`, which is the shared base every theme
   builds on.
4. If Super Admin should be able to recolor it, add its token spec to
   `src/themes/palettes.js` (keep it in sync with `super_admin/api/tenants/theme_palettes.py`
   and `dollara/api/services/theme_palettes.py`).

Registering it anywhere else isn't needed — the folder is the registration.
