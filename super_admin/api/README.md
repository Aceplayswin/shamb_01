# Platform Super Admin API

Standalone control-plane service for the white-label gaming platform. Operates
exclusively on the **master database** (`dollara_master`) and provisions isolated
tenant databases for products like Dollara, Product B, etc.

This service is deployed separately from the per-product API (`dollara/api`) at
`admin.ultraconic.com`.

## Setup

```bash
cd super_admin/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Load the master schema (once):

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dollara_master CHARACTER SET utf8mb4;"
mysql -u root dollara_master < database/master.sql
```

Seed the platform super admin and initial products:

```bash
python manage.py seed_master
```

## Run

```bash
python manage.py runserver 0.0.0.0:8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/super-admin/auth/login` | Super Admin login |
| GET/PUT | `/api/v1/super-admin/products/<slug>/branding` | White-label branding (admin) |
| GET | `/api/v1/public/products/<slug>/branding` | Public branding for product frontends |
| GET | `/api/v1/public/products/<slug>/theme` | Public active theme for product frontends |
| POST | `/api/v1/super-admin/products/<slug>/credential/generate` | Issue the product's RSA webhook key pair |
| GET | `/api/v1/super-admin/products/<slug>/data-webhook/summary` | Pull product data over the signed webhook |

Default credentials after `seed_master`: `superadmin` / `Admin@123`

## Product webhook data channel

Super Admin no longer connects to a product's database directly. It pulls data
over an RSA-signed HTTP webhook (each product has its own key pair, issued at
creation). See [`WEBHOOK_DATA_CHANNEL.md`](WEBHOOK_DATA_CHANNEL.md) for the full
contract and the Phase 2 product-side plan.
