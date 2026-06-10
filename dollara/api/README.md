# Dollara Product API (Django)

Multi-tenant, white-label gaming backend for **product deployments** (Dollara,
Product B, Product C, ...). Each product has its own isolated MySQL database.
Branding, themes, and URLs are configured in the master DB via Super Admin.

> **Super Admin** (product onboarding, master DB management, branding, themes)
> lives in the separate [`super_admin/api`](../../super_admin/api) service.

## Stack

- **Django 5** + **Django REST Framework**
- **Strawberry GraphQL**
- **Django Channels** (WebSocket at `/ws`)
- **MySQL** (master read + database-per-tenant)
- **PyTorch** fraud detection, welcome-call scripts, support chatbot (`core/ai/`)
- **JWT** authentication (product admins, users)
- **bcrypt** password hashing

## Architecture

```
                       ┌─────────────────────────────────────┐
Super Admin API ─────► │  Master MySQL DB (master.sql)        │
(super_admin/api)      │  products, urls, branding, databases │
                       │  product_themes                      │
                       └─────────────────────────────────────┘
                                 │ TenantRouter (database-per-tenant)
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
  dollara_db               productb_db               productc_db
  (users, wallets,         (isolated copy            (isolated copy
   games, txns, ...)        of init.sql schema)       of init.sql schema)
```

- `tenants/` — read-only control-plane models (mirror of `super_admin/api`).
- `services/` — `tenant_resolver`, `branding`.
- `middleware/` — `TenantResolverMiddleware` + `TenantRouter`.
- `core/` — per-tenant features (auth, wallet, games, transactions, admin, AI).

### Tenant resolution

A request's tenant is resolved (in priority order) from:

1. `X-Tenant` / `X-Tenant-ID` header (mobile app, server-to-server).
2. Request host / subdomain (`dollara.localhost` → `dollara`).
3. The `tenant` claim in the JWT.
4. `DEFAULT_TENANT` (development fallback for `localhost`).

The resolver looks up the tenant's connection in the master `databases` table
and registers a dynamic Django connection (`tenant_<slug>`).

### Branding & themes

Branding and live theme are managed in Super Admin and exposed via public
platform endpoints:

- `GET /api/v1/public/products/<slug>/branding`
- `GET /api/v1/public/products/<slug>/theme`

Product frontends (web/mobile) should prefer those endpoints. This API also
exposes `GET /api/v1/branding` as a tenant-resolved fallback.

## Setup

Requires **MySQL 8**. See root [README](../../README.md).

**Prerequisite:** apply `super_admin/api/database/master.sql` and run
`seed_master` from `super_admin/api`.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Run

```bash
python manage.py runserver 0.0.0.0:5000
```

## Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Health check (includes PyTorch version) |
| `GET /api/v1/branding` | White-label branding for the resolved tenant (fallback) |
| `POST /api/v1/auth/...` | Per-tenant auth (login, OTP, demo) |
| `GET/POST /api/v1/wallet...`, `/games...` | Per-tenant features |
| `POST /api/v1/games/launch` | Launch an aggregator game (see [docs/GAMES.md](docs/GAMES.md)) |
| `POST /api/v1/games/callback` | Aggregator bet/win settlement callback |
| `POST /api/v1/admin/...` | Per-tenant product-admin panel |
| `POST /graphql` | GraphQL (Strawberry) |
| `WS /ws` | Live ticker WebSocket |

The external game aggregator integration is documented in **[docs/GAMES.md](docs/GAMES.md)**.
Import a fresh tenant database with `mysql <tenant_db> < database/init.sql` (schema + seed data: admin, 263 games, settings).

## Default credentials (after init.sql import)

- Per-tenant admin (each tenant DB): `superadmin` / `Admin@123`
