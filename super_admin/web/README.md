# Platform Super Admin Web

Standalone Next.js console for the white-label gaming platform control plane.
Deployed separately from product frontends (e.g. Dollara) at `admin.ultraconic.com`.

## Setup

```bash
cd super_admin/web
npm install
cp .env.example .env
```

## Run

```bash
npm run dev
```

Open http://localhost:3001/login

Configure `NEXT_PUBLIC_API_URL` to point at the Super Admin API (default `http://localhost:5000`).
