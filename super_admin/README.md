# Platform Super Admin

Standalone control plane for the white-label multi-tenant gaming platform. Manages
products, domains, branding, tenant database provisioning, and cross-tenant analytics
via the **master database** — completely separate from any product deployment (Dollara, etc.).

```
super_admin/
├── api/     # Django control-plane API (port 5000)
└── web/     # Next.js console (port 3001 → admin.ultraconic.com)
```

## Architecture

| Layer | Service | Domain (prod) | Database |
|-------|---------|---------------|----------|
| Super Admin | `super_admin/api` + `super_admin/web` | `admin.ultraconic.com` | Master DB only |
| Product (e.g. Dollara) | `dollara/api` + `dollara/web` + `dollara/mobile` | `dollara.com` | Master (read) + tenant DB |

The product API reads tenant config from the master DB but does **not** expose Super Admin endpoints.

## Quick start

```bash
# 1. Master schema (once)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dollara_master CHARACTER SET utf8mb4;"
mysql -u root dollara_master < super_admin/api/database/master.sql

# 2. Super Admin API
cd super_admin/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py seed_master

# 3. Super Admin Web
cd ../web
npm install
cp .env.example .env
npm run dev
```

| Service | URL |
|---------|-----|
| Super Admin console | http://localhost:3001/login |
| Super Admin API | http://localhost:5000 |

Default login: `superadmin` / `Admin@123`

See [api/README.md](api/README.md) and [web/README.md](web/README.md) for details.
