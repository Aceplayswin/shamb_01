# DOLLARA Platform

End-to-end online gambling platform with **90% automated operations**, built per the DOLLARA requirements document.

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
games/
├── api/              # Django API + GraphQL + WebSocket + AI (PyTorch)
│   ├── core/ai/      # Fraud scoring, welcome calls, chatbot
│   ├── .env.example
│   └── database/
├── web/              # Next.js player + admin UI
│   └── .env.example
├── dollara/          # React Native mobile app
│   └── README.md
└── package.json
```

Each app loads its own `.env` from its directory.

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

Create the database and user:

```bash
mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS dollara;
  CREATE USER IF NOT EXISTS 'dollara'@'localhost' IDENTIFIED BY 'dollara_pass';
  GRANT ALL PRIVILEGES ON dollara.* TO 'dollara'@'localhost';
  FLUSH PRIVILEGES;
"
```

Optional — load the reference schema before migrations:

```bash
mysql -u dollara -pdollara_pass dollara < api/database/init.sql
```

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

### 3. Database

From the repo root (with the API venv activated, or use `api/.venv/bin/python`):

```bash
npm run db:migrate
npm run db:seed
```

If you already imported `api/database/init.sql`, run migrations with a fake initial instead:

```bash
cd api && python manage.py migrate --fake-initial && python manage.py seed
```

### 4. Mobile app (optional)

```bash
cd dollara
npm install
npm start
# npm run ios   or   npm run android
```

See [dollara/README.md](dollara/README.md) for API host configuration on emulators vs devices.

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
| Web | http://localhost:3000 |
| API (REST) | http://localhost:4000 |
| GraphQL | http://localhost:4000/graphql |
| WebSocket | ws://localhost:4000/ws |
| Admin UI | http://localhost:3000/admin/login |

## Default credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `superadmin` | `Admin@123` |

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
| `npm run db:migrate` | Run Django migrations |
| `npm run db:seed` | Seed admin and sample data |
| `npm run build` | Production Next.js build |
| `npm run lint` | Lint web app |

## Roadmap

- **Phase 2**: AI voice (ElevenLabs/Polly), WhatsApp/SMS automation, chatbot, auto-approval
- **Phase 3**: Agent/affiliate panels, community, reporting, mobile app (Expo)
- **Phase 4**: Game providers (Evolution, Pragmatic), sports odds, KYC APIs
- **Phase 5**: Multi-brand, predictive analytics, tournaments, VIP

## License

Proprietary — DOLLARA Platform
