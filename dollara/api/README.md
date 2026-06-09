# Dollara Product API (Django)

Multi-tenant, white-label gaming backend for **product deployments** (Dollara,
Product B, Product C, ...). Each product has its own isolated MySQL database.
Only branding, domains, and configuration differ between products.

> **Super Admin** (product onboarding, master DB management) lives in the separate
> [`super_admin/api`](../../super_admin/api) service — not in this API.

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
                       ┌─────────────────────┐
Super Admin API ─────► │  Master MySQL DB     │  products, domains, branding
(super_admin/api)      │  (read via resolver) │
                       └─────────────────────┘
                                 │ TenantRouter (database-per-tenant)
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                         ▼
  dollara_db               productb_db               productc_db
  (users, wallets,         (isolated copy            (isolated copy
   games, txns, ...)        of init.sql schema)       of init.sql schema)
```

- `tenants/` — control-plane models (read from master DB for tenant resolution).
- `services/` — `tenant_resolver`, `branding` (provisioning is in `super_admin/api`).
- `middleware/` — `TenantResolverMiddleware` + `TenantRouter`.
- `core/` — per-tenant features (auth, wallet, games, transactions, admin, AI).

### Tenant resolution

A request's tenant is resolved (in priority order) from:

1. `X-Tenant` / `X-Tenant-ID` header (mobile app, server-to-server).
2. Request host / subdomain (`dollara.com` -> `dollara`, `productb.localhost` -> `productb`).
3. The `tenant` claim in the JWT.
4. `DEFAULT_TENANT` (development fallback for `localhost`).

## Setup

Requires **MySQL 8**. See root [README](../../README.md).

**Prerequisite:** run `seed_master` from `super_admin/api` to create the master DB,
Super Admin account, and initial tenant databases.

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
| `GET /api/v1/branding` | White-label branding for the resolved tenant (public) |
| `POST /api/v1/auth/...` | Per-tenant auth (login, OTP, demo) |
| `GET/POST /api/v1/wallet...`, `/games...` | Per-tenant features |
| `POST /api/v1/admin/...` | Per-tenant product-admin panel |
| `POST /graphql` | GraphQL (Strawberry) |
| `WS /ws` | Live ticker WebSocket |

Example — branding differs per tenant:

```bash
curl -s http://localhost:5000/api/v1/branding -H 'Host: dollara.localhost'
curl -s http://localhost:5000/api/v1/branding -H 'X-Tenant: productb'
```

## Default credentials (after seed_master)

- Per-tenant admin (each tenant DB): `superadmin` / `Admin@123`
