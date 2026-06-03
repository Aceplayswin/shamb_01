# DOLLARA API (Django)

Python backend for the DOLLARA platform.

## Stack

- **Django 5** + **Django REST Framework**
- **Strawberry GraphQL**
- **Django Channels** (WebSocket at `/ws`)
- **MySQL** + **Redis**
- **PyTorch** fraud detection, welcome-call scripts, support chatbot (`core/ai/`)
- **JWT** authentication (users & admins)
- **bcrypt** password hashing

## Setup

Requires **MySQL 8** and **Redis** running locally (see root [README](../../README.md)).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and adjust `MYSQL_*` / `REDIS_URL` if needed.

```bash
mysql -u dollara -pdollara_pass dollara < database/init.sql
python manage.py seed
python manage.py runserver 0.0.0.0:4000
```

## Endpoints

| Path | Description |
|------|-------------|
| `GET /health` | Health check (includes PyTorch version) |
| `POST /api/v1/...` | REST API |
| `POST /api/v1/ai/fraud-score` | Fraud score (admin) |
| `POST /api/v1/ai/trigger-welcome-call` | Welcome call script + log |
| `POST /api/v1/ai/chat` | Support chatbot |
| `POST /graphql` | GraphQL (Strawberry) |
| `WS /ws` | Live ticker WebSocket |

## Admin credentials (after seed)

- Username: `superadmin`
- Password: `Admin@123`
