// Theme registry — the code-defined catalog of full UI skins for the player site.
//
// Each theme provides the chrome + homepage the app shell renders:
//   - Header:         top/side navigation chrome
//   - Footer:         footer chrome
//   - Home:           homepage body (between Header and Footer)
//   - frameClassName: the shell offsets AppFrame applies for this theme's chrome
//
// The Super Admin chooses which theme key is active per product (stored in the
// control plane, served at /api/v1/super-admin/public/theme). The KEYS here MUST
// stay in sync with AVAILABLE_THEMES in super_admin/api (tenants/views.py) and the
// dropdown in super_admin/web (products/page.jsx).
//
// 'theme1' is the default and reproduces the original Dollara design exactly.

import * as theme1 from './theme1';
import * as theme2 from './theme2';

export const DEFAULT_THEME = 'theme1';

export const THEMES = {
  theme1,
  theme2,
};

export function getTheme(key) {
  return THEMES[key] ?? THEMES[DEFAULT_THEME];
}
