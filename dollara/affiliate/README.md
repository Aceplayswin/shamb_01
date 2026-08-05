# Dollara Affiliate Portal — Developer Documentation

**Stack:** Next.js 14 (App Router) · JavaScript · Tailwind CSS · Lucide React · SweetAlert2  
**Port:** `3003`  
**Branch:** `feat/affiliate-panel-frontend`

---

## Project Purpose

This is the **partner-facing affiliate portal** for the Dollara iGaming platform. It is intentionally kept as a separate Next.js app (its own `package.json`, own port, own auth) rather than a route inside `dollara/web` or `dollara/admin` because affiliates are a distinct trust boundary — not players, not staff.

There are three portals in total:

| Portal | Path | Port | Who uses it |
|---|---|---|---|
| Player web | `dollara/web` | 3000 | Players |
| Staff admin | `dollara/admin` | 3002 | Internal staff |
| **Affiliate** | `dollara/affiliate` | **3003** | External partners |

---

## Running Locally

```bash
cd shamb_01/dollara/affiliate
npm install
npm run dev          # starts on http://localhost:3003
```

---

## Folder Structure

```
dollara/affiliate/
├── package.json               # deps + "dev": "next dev -p 3003"
├── tailwind.config.js         # brand color tokens (brand-400 to brand-600 = gold/amber)
├── public/
│   ├── logo/image.png         # Dollara logo used in headers
│   ├── banner-image/banner1.png
│   ├── web/website_image.png  # platform screenshot used in landing page brand section
│   └── payment/               # bhmi.png, imps.png, upi.png — payment method logos
└── src/
  └── app/
    ├── globals.css        # Ice-Blue light theme, glass utility, grid background
    ├── layout.js          # root layout (font loading, html/body)
    ├── page.js            # PUBLIC — Landing page
    ├── apply/
    │   └── page.js        # PUBLIC — 3-step application wizard
    ├── login/
    │   ├── page.js        # AUTH — Email + password form
    │   ├── 2fa/
    │   │   └── page.js    # AUTH — 6-digit OTP verification
    │   ├── forgot/
    │   │   └── page.js    # AUTH — Password reset / send recovery link
    │   └── _components/
    │       └── AuthShell.js   # Shared: page wrapper + CSS token exports
    ├── onboarding/
    │   ├── page.js            # POST-APPROVAL — Orchestrator (state only)
    │   └── _components/
    │       ├── tokens.js          # Shared: CSS class strings + Spinner
    │       ├── OnboardingShell.js # Shared: top-bar, glass card, step dots, progress bar
    │       ├── StepTerms.js       # Step 1: scrollable T&C + agree checkbox
    │       ├── StepPayout.js      # Step 2: UPI / Crypto / Bank Wire inputs
    │       ├── StepKYC.js         # Step 3: drag-and-drop document upload
    │       └── StepTrackingLink.js # Step 4: referral link, copy button, summary
    └── (dashboard)/
      ├── dashboard/page.js         # Main stats dashboard
      ├── _components/              # Shared dashboard components
      │   ├── ActivityFeed.js
      │   ├── ActivityFeed.module.css
      │   ├── ChartPlaceholder.js
      │   ├── StatCard.js
      │   └── Sidebar.js
      ├── links/
      │   └── page.js                # Tracking links + creative gallery
      ├── referrals/
      │   ├── page.js                # Referred players table
      │   └── _components/           # referral helpers
      ├── network/
      │   └── page.js                # Sub-affiliates tree view
      ├── finance/
      │   ├── earnings/page.js       # Commission ledger and statements
      │   └── payouts/page.js        # Balance, request modal, manage methods
      ├── reports/
      │   └── page.js                # Custom date-range reports + CSV export (mock)
      ├── settings/
      │   ├── profile/page.js        # Company, contact, password, 2FA, notifications
      │   └── api/page.js            # API keypair UI, webhook config (mock)
      ├── notifications/
      │   └── page.js                # In-app notifications feed
      └── support/
        └── page.js                # Support ticket list + new ticket form (mock)
```

---

## Pages & Routes

| URL | File | Status | Description |
|---|---|---|---|
| `/` | `src/app/page.js` | Built | Landing page — pitch, calculator, deals, FAQ |
| `/apply` | `src/app/apply/page.js` | Built | 3-step application wizard |
| `/login` | `src/app/login/page.js` | Built | Email + password login form |
| `/login/2fa` | `src/app/login/2fa/page.js` | Built | 6-digit OTP verification screen |
| `/login/forgot` | `src/app/login/forgot/page.js` | Built | Password recovery email form |
| `/onboarding` | `src/app/onboarding/page.js` | Built | 4-step post-approval onboarding wizard |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.js` | Built | Main stats dashboard (implemented)
| `/links` | `src/app/(dashboard)/links/page.js` | Built | Tracking links + creative assets (links directory + creative gallery)
| `/referrals` | `src/app/(dashboard)/referrals/page.js` | Built | Referred player table (implemented)
| `/network` | `src/app/(dashboard)/network/page.js` | Built | Sub-affiliate tree view (Sub-affiliates implemented)
| `/finance/earnings` | `src/app/(dashboard)/finance/earnings/page.js` | Built | Commission ledger (earnings / statements implemented)
| `/finance/payouts` | not yet built | Planned | Balance + payout requests |
| `/reports` | not yet built | Planned | Custom date-range reports |
| `/settings/profile` | not yet built | Planned | Company info, 2FA, password |
| `/settings/api` | not yet built | Planned | API keypair + webhook config |
| `/notifications` | not yet built | Planned | In-app activity feed |
| `/support` | not yet built | Planned | Support ticket list + new ticket |

| `/finance/payouts` | `src/app/(dashboard)/finance/payouts/page.js` | Built | Balance card, request modal, manage methods modal |
| `/reports` | `src/app/(dashboard)/reports/page.js` | Built | Custom date-range reports + CSV export (client mock) |
| `/settings/profile` | `src/app/(dashboard)/settings/profile/page.js` | Built | Company info, contact, password, 2FA toggle, notification prefs |
| `/settings/api` | `src/app/(dashboard)/settings/api/page.js` | Built | API keypair UI, rotate/revoke controls, webhook config (mock) |
| `/notifications` | `src/app/(dashboard)/notifications/page.js` | Built | In-app notifications feed with read/clear actions |
| `/support` | `src/app/(dashboard)/support/page.js` | Built | Support ticket list + new-ticket form (mock) |

---

## Design System

### Theme
The portal uses a **light Ice-Blue Glassmorphism** theme defined in `src/app/globals.css`.

- **Background:** `#F4F6FA` slate/ice-blue with a subtle dot grid pattern
- **Text:** `slate-900` (#0F172A) for headings, `slate-600` for body
- **Brand Accent (buttons, highlights):** Gold / Amber — `brand-400` to `brand-600`
- **Cards:** `.glass` utility — `bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl`
- **Status colors:** `emerald-600` = success/active, `amber-600` = pending, `red-600` = rejected

### Tailwind Brand Colors
Defined in `tailwind.config.js`:
```js
brand: {
  300: '#F5D57A',
  400: '#E2B13C',
  500: '#D4A017',
  600: '#B8860B',
}
```

### Fonts
- **Display / headings:** `font-display` — Geist loaded in `layout.js`
- **Body / UI:** `font-sans` — Geist Sans

---

## Shared Components

### `login/_components/AuthShell.js`
Used by all three login screens (`login`, `2fa`, `forgot`). Provides:
- The top bar (back link + Dollara logo)
- The frosted glass card wrapper
- Exported CSS tokens: `inputClasses`, `labelClasses`, `primaryBtn`, `Spinner`

Usage:
```jsx
import AuthShell, { inputClasses, primaryBtn, Spinner } from './_components/AuthShell';

export default function MyAuthPage() {
  return (
    <AuthShell backHref="/login" backLabel="Back to Login">
      {/* your form content here */}
    </AuthShell>
  );
}
```

### `onboarding/_components/tokens.js`
Shared CSS strings and `Spinner` used by all four onboarding step files.

| Export | Used for |
|---|---|
| `inputClasses` | All text inputs, selects, textareas |
| `labelClasses` | All label elements |
| `primaryBtn` | Gold "Next / Submit / Continue" buttons |
| `ghostBtn` | White "Back" buttons |
| `Spinner` | Loading indicator inside buttons |

Usage:
```jsx
import { inputClasses, labelClasses, primaryBtn, ghostBtn, Spinner } from './tokens';
```

### `onboarding/_components/OnboardingShell.js`
Wraps all onboarding steps. Renders:
- Top bar (back to login + logo)
- Frosted glass card
- 4-step indicator dots (completed / current / upcoming)
- Animated progress bar

Props:
```jsx
<OnboardingShell currentStep={2}>
  {/* step content */}
</OnboardingShell>
```

---

## Apply Page — 3-Step Wizard

**File:** `src/app/apply/page.js`

State and sub-components are all in one file (small enough not to need splitting).

| Step | Fields |
|---|---|
| 1 — Account Details | Full Name, Email |
| 2 — Personal Details | Company, Traffic Source, Expected Volume (FTDs), Website URLs |
| 3 — Payment Methods | Payout Preference (Bank / UPI / Crypto) |

After submission: shows a SweetAlert success popup and flips to a pending status screen.

---

## Onboarding Page — 4-Step Wizard

**Orchestrator:** `src/app/onboarding/page.js` — holds all shared state, passes props down.
**UI:** Each step is a separate file in `_components/`.

| File | Step | What it does |
|---|---|---|
| `StepTerms.js` | 1 | Scrollable T&C text, disabled checkbox until read |
| `StepPayout.js` | 2 | UPI / Crypto / Bank Wire tabs with conditional fields |
| `StepKYC.js` | 3 | Drag-and-drop file zone (local dragOver state) |
| `StepTrackingLink.js` | 4 | Auto-generated referral link, copy button, and onboarding summary |

To add a new step: create a new `StepXxx.js` in `_components/`, add its state to `page.js`, and add it to the `OnboardingShell` STEPS array.

---

## Login Flows

| File | Route | What it handles |
|---|---|---|
| `login/page.js` | `/login` | Email + password, redirects to `/login/2fa` on success |
| `login/2fa/page.js` | `/login/2fa` | 6 OTP digit boxes with auto-focus, verify and redirect to `/dashboard` |
| `login/forgot/page.js` | `/login/forgot` | Email field, SweetAlert confirmation, redirect back to `/login` |

> **Note:** All auth logic is currently simulated with `setTimeout`. Wire these to the real Django API endpoints in Phase 2 (look for comments marked `// Phase 2`).

---

## Phase Notes

| Phase | Scope |
|---|---|
| **Phase 1 (current)** | All UI built with mock/static data. No real API calls. |
| **Phase 2** | Replace `setTimeout` mocks with real `fetch` calls to `dollara/api`. Add JWT auth, session cookies. |
| **Phase 3** | Add the Affiliates section to `dollara/admin` for staff-facing approval, commission overrides. |

---

## Changelog — 2026-08-04

Today's work (automatic summary from local commits):

- `43785c1` — implement Sub-affiliates / Network and Earnings / Commission ledger
- `76458e4` — implement affiliate panel dashboard, links directory, creative gallery, and referred players portal

Additional work (2026-08-05):

- Implemented Reports page, API & Integration UI, Notifications feed, Profile/Settings, and Support pages (client-side mocks and UI components).

If you'd like, I can expand each item into a short summary with affected files and screenshots (if available).


## Key Conventions

1. **`_components/` prefix** — The `_` tells Next.js App Router to skip this folder as a route. It won't be publicly accessible as a URL.
2. **`tokens.js` pattern** — Never inline long Tailwind class strings directly in JSX. Always import from the nearest `tokens.js` to change styles in one place.
3. **No API calls in Phase 1** — All submit handlers simulate with `setTimeout`. Do not connect to the backend until Phase 2.
4. **Static assets** — Always place images in `/public/` at the root level, not `src/app/public/`. Reference them as `/logo/image.png` (no `/public/` prefix needed in `src` attributes).
5. **Ports** — Never change the port from `3003`. Other apps use `3000` (web), `3001` (super_admin), and `3002` (admin).
