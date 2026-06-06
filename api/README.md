# Platform API (Django)

Multi-tenant, white-label gaming SaaS backend. One Django codebase serves many
products (Dollara, Product B, Product C, ...), each with its own isolated MySQL
database. Only branding, domains, and configuration differ between products.

## Stack

- **Django 5** + **Django REST Framework**
- **Strawberry GraphQL**
- **Django Channels** (WebSocket at `/ws`)
- **MySQL** (master + database-per-tenant) + **Redis** (optional in dev)
- **PyTorch** fraud detection, welcome-call scripts, support chatbot (`core/ai/`)
- **JWT** authentication (super admins, product admins, users)
- **bcrypt** password hashing

## Architecture

```
                       ┌─────────────────────┐
Super Admin ─────────► │  Master MySQL DB     │  products, domains,
                       │  (default connection)│  tenant_databases, branding,
                       └─────────────────────┘  subscriptions, super_admin_users
                                 │ TenantRouter (database-per-tenant)
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
  dollara_db               productb_db               productc_db
  (users, wallets,         (isolated copy            (isolated copy
   games, txns, ...)        of init.sql schema)       of init.sql schema)
```

- `tenants/` (app) — control-plane models on the master DB.
- `services/` — `tenant_resolver`, `tenant_provisioning`, `branding`.
- `middleware/` — `TenantResolverMiddleware` (resolves tenant per request) and
  `TenantRouter` (routes the ORM to the right database).
- `tenants/state.py` — thread-local tenant context + runtime connection registration.
- `core/` — the per-tenant feature app (auth, wallet, games, transactions, admin, AI).

### Tenant resolution

A request's tenant is resolved (in priority order) from:

1. `X-Tenant` / `X-Tenant-ID` header (mobile app, server-to-server).
2. Request host / subdomain (`dollara.com` -> `dollara`, `productb.localhost` -> `productb`).
3. The `tenant` claim in the JWT.
4. `DEFAULT_TENANT` (development fallback for `localhost`).

## Setup

Requires **MySQL 8** (Redis optional in dev). See root [README](../README.md).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # adjust MASTER_MYSQL_* / MYSQL_* / DEFAULT_TENANT
```

### 1. Create + load the master database

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dollara_master CHARACTER SET utf8mb4;"
mysql -u root dollara_master < database/master.sql
```

### 2. Seed the master DB and provision the initial tenants

This creates the Super Admin and provisions `dollara_db`, `productb_db`,
`productc_db` (creates each database, applies `database/init.sql`, and seeds it):

```bash
# USE_REDIS=0 lets it run without a local Redis
USE_REDIS=0 python manage.py seed_master
```

Seed (or re-seed) a single tenant database manually:

```bash
python manage.py seed --tenant dollara --brand_name "Dollara"
```

### 3. Run

```bash
USE_REDIS=0 python manage.py runserver 0.0.0.0:4000
```

## Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Health check (includes PyTorch version) |
| `GET /api/v1/branding` | White-label branding for the resolved tenant (public) |
| `POST /api/v1/super-admin/auth/login` | Super Admin login (master DB) |
| `GET/POST /api/v1/super-admin/products...` | Product CRUD, provision, branding, domains |
| `GET /api/v1/super-admin/analytics` | Per-product metrics (all tenants) |
| `POST /api/v1/auth/...` | Per-tenant auth (login, OTP, demo) |
| `GET/POST /api/v1/wallet...`, `/games...` | Per-tenant features |
| `POST /api/v1/admin/...` | Per-tenant product-admin panel |
| `POST /graphql` | GraphQL (Strawberry) |
| `WS /ws` | Live ticker WebSocket |

Example — branding differs per tenant:

```bash
curl -s http://localhost:4000/api/v1/branding -H 'Host: dollara.localhost'
curl -s http://localhost:4000/api/v1/branding -H 'X-Tenant: productb'
```

## Default credentials (after seed)

- Super Admin (master): `superadmin` / `Admin@123`
- Per-tenant admin (each tenant DB): `superadmin` / `Admin@123`
