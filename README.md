# White-Label Gaming SaaS Platform

A multi-tenant, white-label online gaming platform. One backend, one web app, and
one mobile codebase serve unlimited products (Dollara, Product B, Product C, ...),
each with its own **isolated database** and **dynamic branding**. New products are
onboarded from the Super Admin portal with no code changes.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Web** | Next.js 14, React 18, Tailwind CSS |
| **Backend** | Django 5, Django REST Framework, Strawberry GraphQL, Django Channels |
| **AI** | PyTorch (in-process in the API) |
| **Database** | MySQL 8 |
| **Realtime** | Django Channels (in-process) |
| **Infrastructure** | AWS (manual setup) |

## Project Structure

```
white_level_gamming/
├── super_admin/         # Platform control plane (separate deployment)
│   ├── api/             # Master DB API — products, provisioning, analytics
│   └── web/             # Super Admin console (admin.ultraconic.com)
├── dollara/             # Product codebase (shared by all tenants)
│   ├── api/             # Multi-tenant Django API (tenant resolver + features)
│   ├── web/             # Next.js player + per-tenant admin UI
│   └── mobile/          # React Native white-label app
```

Each app loads its own `.env` from its directory.

## Multi-tenant model

- **Master DB** holds the catalog of products, their domains, isolated database
  connection details, branding, and Super Admin accounts.
- **Each product** has a completely isolated tenant database (same schema,
  `database/init.sql`). No data is shared between products.
- The **Tenant Resolver** picks the tenant per request from the domain/subdomain,
  the `X-Tenant` header (mobile), or the JWT `tenant` claim, and the **TenantRouter**
  switches the database connection at runtime.
- The **branding engine** (`GET /api/v1/branding`) drives the product name, colors,
  logo, and support details on web and mobile — no hardcoded brand in source.

See [api/README.md](api/README.md) for the full backend architecture.

## Features (Phase 1)

### Player web (`web/`)
- Splash screen, geo detection, OTP registration, demo accounts
- Homepage, game categories, deposit/withdraw flows, onboarding
- Wallet display, live tickers, profile and auth pages

### API (`api/`)
- JWT auth (users and admins), wallets, transactions, games catalog
- Admin stats, withdrawal approval, WebSocket live feed, GraphQL
- Built-in AI: PyTorch fraud scoring, welcome-call scripts, support chatbot

See [api/README.md](api/README.md) for API setup and endpoints.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- MySQL 8 running locally

**macOS (Homebrew):**

```bash
brew install mysql
brew services start mysql
```

Create and load the **master** (control-plane) database:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dollara_master CHARACTER SET utf8mb4;"
mysql -u root dollara_master < super_admin/api/database/master.sql
```

The per-tenant databases (`dollara_db`, `productb_db`, `productc_db`) are created
automatically by `seed_master` in the Super Admin API (see step 3).

### 1. Environment

```bash
cp dollara/api/.env.example dollara/api/.env
cp dollara/web/.env.example dollara/web/.env
cp super_admin/api/.env.example super_admin/api/.env
cp super_admin/web/.env.example super_admin/web/.env
```

Edit env files for database credentials and secrets.

### 2. Install dependencies

```bash
# Super Admin API
cd super_admin/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# Dollara API (includes PyTorch for fraud detection)
cd dollara/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# Web apps
cd super_admin/web && npm install && cd ../..
cd dollara/web && npm install && cd ../..
```

### 3. Seed master + provision tenant databases

With the Super Admin API venv activated:

```bash
cd super_admin/api && python manage.py seed_master
```

### 4. Mobile app (optional)

```bash
cd mobile
npm install
npm start
# npm run ios   or   npm run android
```

The mobile build is white-labelled via [mobile/src/tenant.js](mobile/src/tenant.js)
(`API_URL`, `TENANT_SLUG`, brand defaults). See [mobile/README.md](mobile/README.md)
for API host configuration on emulators vs devices.

### 5. Run locally

**Super Admin (control plane):**

```bash
# Terminal 1 — Super Admin API (port 8000)
cd super_admin/api && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8000

# Terminal 2 — Super Admin console (port 3001)
cd super_admin/web && npm run dev
```

**Dollara product (player + tenant admin):**

```bash
# Terminal 3 — Product API (port 5000)
cd dollara/api && source .venv/bin/activate && python manage.py runserver 0.0.0.0:5000

# Terminal 4 — Product web (port 3000)
cd dollara/web && npm run dev
```

## URLs

| Service | URL |
|---------|-----|
| Super Admin console | http://localhost:3001/login |
| Super Admin API | http://localhost:8000 |
| Dollara web (player) | http://localhost:3000 |
| Product Admin UI | http://localhost:3000/admin/login |
| Product API (REST) | http://localhost:5000 |
| Branding (per tenant) | http://localhost:5000/api/v1/branding |
| GraphQL | http://localhost:5000/graphql |
| WebSocket | ws://localhost:5000/ws |

Switch tenants in local dev with `?tenant=productb` (sets the `x-tenant` cookie)
or by using a subdomain host such as `productb.localhost:3000`.

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| Super Admin | `superadmin` | `Admin@123` | Super Admin console (`/login` on port 3001) |
| Product Admin | `superadmin` | `Admin@123` | Each tenant DB (`/admin/login`) |

Change these before any production deployment.

### Admin panel

Sign in at `/admin/login`. The panel includes:

- **Dashboard** — users, deposits, withdrawals, liability
- **Users** — status, KYC, wallet adjustments
- **Transactions** — all payment activity with filters
- **Deposits / Withdrawals** — approve, confirm, or reject
- **Games & Providers** — catalog CRUD
- **Bets, Bonuses, Settings** — operations and platform config
- **AI Calls & Staff** — call logs and admin accounts

Admin auth uses a separate `admin_token` in localStorage (not the player JWT).

## API examples

```bash
# Health (includes pytorch_version)
curl http://localhost:5000/health

# Send OTP (dev: OTP printed in API console)
curl -X POST http://localhost:5000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","channel":"sms"}'

# Demo account
curl -X POST http://localhost:5000/api/v1/auth/demo

# Geo detection
curl http://localhost:5000/api/v1/geo/detect

# Fraud score (admin JWT required)
curl -X POST http://localhost:5000/api/v1/ai/fraud-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"userId":"test","amount":5000}'

# Support chatbot (user or admin JWT)
curl -X POST http://localhost:5000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"How do I deposit?"}'
```

## Environment variables

| Service | Config | Example |
|---------|--------|---------|
| Super Admin API | `super_admin/api/.env` | [super_admin/api/.env.example](super_admin/api/.env.example) |
| Super Admin Web | `super_admin/web/.env` | [super_admin/web/.env.example](super_admin/web/.env.example) |
| Product API | `dollara/api/.env` | [dollara/api/.env.example](dollara/api/.env.example) |
| Product Web | `dollara/web/.env` | [dollara/web/.env.example](dollara/web/.env.example) |

**Web (`web/.env`)**

- `NEXT_PUBLIC_API_URL` — REST base URL
- `NEXT_PUBLIC_GRAPHQL_URL` — GraphQL endpoint
- `NEXT_PUBLIC_WS_URL` — live ticker WebSocket

**API (`api/.env`)**

- `DJANGO_SECRET_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `MYSQL_*`
- `AWS_*`, Twilio/WhatsApp/MSG91 keys (production)

## AWS (manual setup)

Provision RDS (MySQL), S3, and compute as needed. Set production values in `dollara/api/.env`:

- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Point `dollara/web/.env` `NEXT_PUBLIC_*` URLs at your deployed product API.

## NPM scripts

Each app has its own `package.json`. From `super_admin/web` or `dollara/web`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint web app |

## Roadmap

- **Phase 2**: AI voice (ElevenLabs/Polly), WhatsApp/SMS automation, chatbot, auto-approval
- **Phase 3**: Agent/affiliate panels, community, reporting, mobile app (Expo)
- **Phase 4**: Game providers (Evolution, Pragmatic), sports odds, KYC APIs
- **Phase 5**: Multi-brand, predictive analytics, tournaments, VIP

## License

Proprietary — DOLLARA Platform
