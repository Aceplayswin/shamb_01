# Mobile App (React Native)

White-label React Native player app for the gaming SaaS platform. The same
codebase ships every product (Dollara, Product B, ...) — only the build-time
tenant config and the dynamically-loaded branding differ.

## Features

- Login, OTP registration, one-tap demo account
- Home with trending games and live wallet
- Browse games by category (Lottery, Casino, Sports, Slots, Fantasy, AI)
- Place bets via API
- Deposit & withdraw (with dev deposit confirm)
- Transaction history
- AI support chatbot
- Profile with KYC status (GraphQL `me`)

## Prerequisites

- Node.js 22+
- API running at port **4000** (see `../api`)
- iOS: Xcode · Android: Android Studio

## White-label / tenant config

Edit [src/tenant.js](src/tenant.js) per product build:

- `API_URL` — backend base URL
- `TENANT_SLUG` — product slug sent as the `X-Tenant` header (e.g. `dollara`, `productb`)
- `DEFAULT_BRANDING` — fallback name/colors shown before `/api/v1/branding` loads

At runtime the app fetches the tenant's branding (name, colors, logo, support)
and applies it via `src/branding.js`.

| Platform | API host |
|----------|----------|
| iOS Simulator | `http://localhost:4000` |
| Android Emulator | `http://10.0.2.2:4000` |
| Physical device | Your machine's LAN IP, e.g. `http://192.168.1.x:4000` |

## Setup

```bash
# Start MySQL, Redis, API (from repo root)
cd ../api && source .venv/bin/activate
python manage.py runserver 0.0.0.0:4000

# Mobile app
cd mobile
npm install
npm start

# Another terminal
npm run ios
# or
npm run android
```

## Default admin (API)

- Username: `superadmin` / Password: `Admin@123`

## Dev tips

- After deposit, use **"[Dev] Confirm deposit"** to credit wallet via API.
- OTP codes are printed in the API terminal during development.
- Demo account works without registration.
