---
name: gaming-module-architecture
description: How the dollara/api gaming module (aggregator launch + AES callbacks) is structured and tested
metadata:
  type: project
---

The gaming module in `dollara/api` integrates an external game aggregator (games run in an iframe; bets/wins settle via callback). Rebuilt from the legacy PHP analysis in repo-root `games.md`.

**Layers (clean architecture):**
- `services/game_provider.py` — the ONLY wire layer: AES-256-ECB (PKCS#7, base64) crypto + aggregator HTTP. All creds/keys/URLs come from `settings.GAME_PROVIDER` (env vars, never hardcoded).
- `core/game_services.py` — launch + callback settlement + reporting business logic. `process_callback` is idempotent (unique `serial_number` on `game_rounds`) and transaction-safe (`SELECT FOR UPDATE` wallet + `tenant_atomic()`).
- `core/game_admin_services.py` — status toggle, GGR analytics, reports.
- `core/repositories.py` — all ORM/data access.
- `core/game_schemas.py` — request/callback validation (accepts legacy `GAME_UID` and new `gameUid` keys for frontend compat).

**New models** (`core/models.py`): `GameSession`, `GameRound`, `GameCallbackLog`; extended `Game` (`game_uid`, `game_type`, `is_active`) and `Wallet` (`wagering_balance`, replaces legacy `tbl_requiredplay_balance`). Schema in `database/init.sql`; idempotent ALTERs for existing tenant DBs in `database/migrations/001_gaming_module.sql`.

**Global games on/off** = `platform_settings` key `game_status` via `GameSettingsRepository`.

**Catalog:** 263 games auto-generated into `core/management/commands/_game_catalog.py`; seed with `python manage.py seed_games --tenant <slug>`.

**Testing gotcha:** production disables Django migrations (`MIGRATION_MODULES={'core':None}`) and routes `core` models to per-tenant MySQL. Tests use `config/test_settings.py` (in-memory SQLite, migrations re-enabled so the runner builds tables from models, no tenant router). Run: `python manage.py test core.tests --settings=config.test_settings`. The venv is at `dollara/api/venv/Scripts/python.exe` (Bash tool does NOT auto-activate it). Requires `requests` + `cryptography` (added to requirements.txt). Related: [[theme-selection-architecture]].
