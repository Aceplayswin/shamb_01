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
python manage.py runserver 0.0.0.0:5000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/super-admin/auth/login` | Super Admin login |
| GET/POST | `/api/v1/super-admin/products...` | Product CRUD, provision, branding, domains |

Default credentials after `seed_master`: `superadmin` / `Admin@123`
