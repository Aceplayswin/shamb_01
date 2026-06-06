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
| **Cache / realtime** | Redis 7 |
| **Infrastructure** | AWS (manual setup) |

## Project Structure

```
dollara/
├── api/                 # Django API (multi-tenant)
│   ├── tenants/         # Control-plane app: products, domains, branding, super admins
│   ├── services/        # tenant_resolver, tenant_provisioning, branding
│   ├── middleware/      # TenantResolverMiddleware + TenantRouter (DB-per-tenant)
│   ├── core/            # Per-tenant features (auth, wallet, games, admin, ai)
│   └── database/        # master.sql (control plane) + init.sql (per tenant)
├── web/                 # Next.js player + admin + super-admin UI
│   └── src/services/    # API layer (tenant-aware) + branding
├── mobile/              # React Native app (env-driven white-label)
│   └── src/branding.js  # Dynamic branding + theme
└── package.json
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
- MySQL 8 and Redis 7 running locally

**macOS (Homebrew):**

```bash
brew install mysql redis
brew services start mysql
brew services start redis
```

Create and load the **master** (control-plane) database:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dollara_master CHARACTER SET utf8mb4;"
mysql -u root dollara_master < api/database/master.sql
```

The per-tenant databases (`dollara_db`, `productb_db`, `productc_db`) are created
automatically by `seed_master` (see step 3).

### 1. Environment

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
```

Edit `api/.env` for database credentials and secrets. Edit `web/.env` if the API is not on `localhost:4000`.

### 2. Install dependencies

```bash
# API (includes PyTorch for fraud detection)
cd api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Web (npm workspace from repo root)
npm install
```

### 3. Seed master + provision tenant databases

With the API venv activated, this creates the Super Admin and provisions the
three initial products (each gets its own isolated database, schema, and seed
data). `USE_REDIS=0` lets it run without a local Redis:

```bash
cd api && USE_REDIS=0 python manage.py seed_master
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

**API + web together:**

```bash
npm run dev
```

**Or separate terminals:**

```bash
# Terminal 1 — Django API (port 4000, includes AI)
npm run dev:api

# Terminal 2 — Next.js (port 3000)
npm run dev:web
```

## URLs

| Service | URL |
|---------|-----|
| Web (player) | http://localhost:3000 |
| Product Admin UI | http://localhost:3000/admin/login |
| Super Admin portal | http://localhost:3000/super-admin/login |
| API (REST) | http://localhost:4000 |
| Branding (per tenant) | http://localhost:4000/api/v1/branding |
| GraphQL | http://localhost:4000/graphql |
| WebSocket | ws://localhost:4000/ws |

Switch tenants in local dev with `?tenant=productb` (sets the `x-tenant` cookie)
or by using a subdomain host such as `productb.localhost:3000`.

## Default credentials

| Role | Username | Password | Where |
|------|----------|----------|-------|
| Super Admin | `superadmin` | `Admin@123` | Master DB (`/super-admin/login`) |
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
curl http://localhost:4000/health

# Send OTP (dev: OTP printed in API console)
curl -X POST http://localhost:4000/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","channel":"sms"}'

# Demo account
curl -X POST http://localhost:4000/api/v1/auth/demo

# Geo detection
curl http://localhost:4000/api/v1/geo/detect

# Fraud score (admin JWT required)
curl -X POST http://localhost:4000/api/v1/ai/fraud-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"userId":"test","amount":5000}'

# Support chatbot (user or admin JWT)
curl -X POST http://localhost:4000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"How do I deposit?"}'
```

## Environment variables

| Service | Config | Example |
|---------|--------|---------|
| API | `api/.env` | [api/.env.example](api/.env.example) |
| Web | `web/.env` | [web/.env.example](web/.env.example) |

**Web (`web/.env`)**

- `NEXT_PUBLIC_API_URL` — REST base URL
- `NEXT_PUBLIC_GRAPHQL_URL` — GraphQL endpoint
- `NEXT_PUBLIC_WS_URL` — live ticker WebSocket

**API (`api/.env`)**

- `DJANGO_SECRET_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `MYSQL_*`, `REDIS_URL`
- `AWS_*`, Twilio/WhatsApp/MSG91 keys (production)

## AWS (manual setup)

Provision RDS (MySQL), ElastiCache (Redis), S3, and compute as needed. Set production values in `api/.env`:

- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `REDIS_URL`
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

Point `web/.env` `NEXT_PUBLIC_*` URLs at your deployed API.

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | API + web concurrently |
| `npm run dev:api` | Django on port 4000 |
| `npm run dev:web` | Next.js on port 3000 |
| `npm run db:seed` | Seed admin and sample data (after `init.sql`) |
| `npm run build` | Production Next.js build |
| `npm run lint` | Lint web app |

## Roadmap

- **Phase 2**: AI voice (ElevenLabs/Polly), WhatsApp/SMS automation, chatbot, auto-approval
- **Phase 3**: Agent/affiliate panels, community, reporting, mobile app (Expo)
- **Phase 4**: Game providers (Evolution, Pragmatic), sports odds, KYC APIs
- **Phase 5**: Multi-brand, predictive analytics, tournaments, VIP

## License

Proprietary — DOLLARA Platform
