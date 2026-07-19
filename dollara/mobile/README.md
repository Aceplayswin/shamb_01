# Mobile App (React Native)

White-label React Native player app for the gaming SaaS platform. The same
codebase ships every product (Dollara, Product B, ...) — only the build-time API
URL and the dynamically-loaded branding/theme differ.

This app mirrors the web player app: same API, same data model, same feature
set, same theme architecture.

## Architecture

The split is the same one the web uses — **data above, rendering below**:

```
src/
  services/     api, graphql, branding/theme endpoints   ─┐
  store/        auth session (token, user, wallet)        │  shared by
  hooks/        catalog, search, play, banners, promos    │  every theme
  lib/          category maps, filters, formatters       ─┘

  themes/
    registry.js       theme key → shell + screens (with fallback)
    palettes.js       Super Admin colors → resolved RN palette
    theme1/
      shell/          TopBar, TabBar (the app's chrome)
      components/     theme-local UI kit + game/banner/promo pieces
      pages/          this theme's version of every screen

  navigation/   theme-agnostic: reads the registry, never imports a theme
```

A **theme is a complete UI/UX** — its own chrome and its own version of every
screen. Only rendering changes between themes; fetching, auth and API live above
that layer. Super Admin picks the theme per product (`theme_key` on
`/api/v1/branding`), and the app renders it with no rebuild.

**Only `theme1` is built today.** The registry is written for the
`theme1`/`theme2` format: any unknown or unbuilt theme key falls back to the
default theme, so nothing breaks before `theme2` exists. To add it, create
`src/themes/theme2/` with a shell + pages and register it in
`src/themes/registry.js`.

### Colors

`palettes.js` resolves Super Admin's palette (`colors` on `/api/v1/branding`)
over each theme's own defaults, using the same tokens as the web
(`app_bg`, `app_fg`, `rail`, `panel`, `panel_strong`, `muted`, `hairline`,
`primary`, `accent`). Every token has a baked-in default, so the app renders
correctly with **no** Super Admin, and per-color when only some are overridden.
Overriding `primary` derives a full 50→950 brand ramp the same way the web does.

Components read the resolved palette via `useTheme()` and build styles with
`useThemedStyles()` — never a hardcoded color.

## Features

Every player feature from the web app:

- Login, OTP registration (SMS/WhatsApp/Telegram/voice), one-tap demo account
- Home: admin banners, category strip, provider filters, live sports / casino /
  trending / slots rails, live big wins, FAQ
- Debounced game search across the catalog
- Browse by category (Lottery, Casino, Sports, Slots, Fantasy, AI, and the
  specific table games)
- **Play** — aggregator games launch full-screen in-app; in-house games use the
  stake form
- Wallet with itemised balance breakdown (real vs bonus vs held vs exposure)
- Deposit (UPI / card / netbanking / crypto) through the gateway sheet
- Withdraw (bank / UPI / crypto) with the review + pending-approval flow
- Bet history with per-session round detail and P&L
- Promotions + promo-code redemption, and My Bonuses with wagering progress
- Refer & earn (server-issued code, native share sheet)
- Profile, settings (languages, currency, notifications), password change
- AI support chat
- App download page

## Playing games

Aggregator games (anything with a `game_uid`) auto-launch and take over the
screen — the mobile equivalent of the web's full-tab redirect. Bets and wins are
settled server-side via the aggregator's callback webhook; the client only opens
the session and refreshes the wallet on exit.

In-app play uses `react-native-webview`, which is a **native** module:

```bash
npm install
cd ios && pod install && cd ..   # iOS only
npm run ios        # or: npm run android
```

Until the app is rebuilt with it linked, `src/components/GameWebView.jsx`
detects that it is missing and falls back to opening the game in the device
browser, so game launch works either way.

## Prerequisites

- Node.js 22+
- API running at port **5000** (see `../api`)
- iOS: Xcode · Android: Android Studio

## White-label / tenant config

Edit [src/config.js](src/config.js) per product build:

- `API_URL` — product API base URL (port 5000)

Everything else — product name, logo, colors, active theme — is fetched at
runtime from that product API's keyless endpoints (`/api/v1/branding`,
`/api/v1/theme`). The API identifies the product from its own api_key, so the
app sends no tenant.

| Platform | API host |
|----------|----------|
| iOS Simulator | `http://localhost:5000` |
| Android Emulator | `http://10.0.2.2:5000` |
| Physical device | Your machine's LAN IP, e.g. `http://192.168.1.x:5000` |

## Setup

```bash
# Start the API (from repo root)
cd ../api && source venv/bin/activate
python manage.py runserver 0.0.0.0:5000

# Mobile app
cd ../mobile
npm install
npm start

# Another terminal
npm run ios
# or
npm run android
```

## Tests

```bash
npm test
```

Covers: every theme1 screen rendering against realistic API payloads (signed in
and signed out), auth guards redirecting, the full app mounting through the
navigator, palette resolution with and without Super Admin overrides, registry
fallback for unbuilt themes, and catalog filtering.

## Dev tips

- OTP codes are returned in the API response during development.
- Demo account works without registration.
- The live catalog has **no** games flagged `is_featured`, so the Trending rail
  falls back to most-played — same rule as the web.
