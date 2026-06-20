# Gaming Module (Python / Django)

Production rebuild of the legacy PHP gaming platform (see `../../games.md`) on the
Dollara Django stack. The module integrates an **external game aggregator**: games
run in an iframe served by the provider, and bets/wins are settled back into the
player wallet via a secure, idempotent, transaction-safe callback.

This is a clean reimplementation, **not** a PHP port — it reuses the existing
`User`, `Wallet`, `Transaction`, `GameProvider`, and `Game` models and follows the
project's service/repository conventions. Legacy DB tables (`tblmatchplayed`,
`tblservices`, `tbl_requiredplay_balance`) are replaced by optimized models.

---

## 1. Architecture

```
┌──────────────┐  POST /games/launch (JWT)   ┌──────────────────┐
│ Web / Mobile │ ──────────────────────────► │  views.py        │
│  frontend    │  { gameUid, gameName }      │  games_launch    │
└──────┬───────┘                             └────────┬─────────┘
       │                                              │ launch_game()
       │ iframe(game_url)                             ▼
       │                                     ┌──────────────────┐
       │                       request_      │ game_services    │──┐
       │                       launch_url()  │ (business logic) │  │ repositories
       ▼                                     └────────┬─────────┘  │ (data access)
┌──────────────┐  bet/win callbacks (AES)            │            ▼
│  Aggregator  │ ◄───────────────────────────────────┘     ┌────────────┐
│ (iframe URL) │ ──► POST /games/callback ──► process_     │   MySQL    │
└──────────────┘     (encrypted payload)     callback()    │ (per-tenant)│
                                                            └────────────┘
```

Layers (clean architecture — business logic is isolated from controllers):

| Layer | File | Responsibility |
|-------|------|----------------|
| Controllers | `core/views.py` | HTTP only: parse, auth, map errors → status |
| Validation | `core/game_schemas.py` | Normalize/validate request + callback bodies |
| Services | `core/game_services.py` | Launch, settlement, reporting business logic |
| Admin services | `core/game_admin_services.py` | Status toggle, analytics, reports |
| Repositories | `core/repositories.py` | All ORM/data access + locking |
| Provider | `services/game_provider.py` | AES crypto + aggregator HTTP (the only wire layer) |
| Models | `core/models.py` | `Game`, `GameSession`, `GameRound`, `GameCallbackLog` |

---

## 2. Configuration (environment variables)

All provider credentials, keys, URLs, and identifiers live in env vars — nothing
is hardcoded. See `.env.example`. Settings are assembled in
`config/settings.py` as `settings.GAME_PROVIDER`.

| Env var | Purpose |
|---------|---------|
| `GAME_AGENCY_UID` | Agency identifier with the aggregator |
| `GAME_AES_SECRET_KEY` | AES-256-ECB key (encrypt launch / decrypt callbacks) |
| `GAME_PLAYER_PREFIX` | Prefix for `member_account` (`prefix` + user id) |
| `GAME_SERVER_URL` | Full aggregator HTTPS base URL from your provider (not the legacy placeholder `https://bet`) |
| `GAME_MOCK_LAUNCH` | Set `1` to use a local mock game frame instead of calling the aggregator |
| `GAME_LAUNCH_PATH` | Launch endpoint path (default `/game/v1`) |
| `GAME_CALLBACK_BASE_URL` | Public base URL the aggregator posts callbacks to |
| `GAME_HOME_URL` | "Back to lobby" URL passed to launched games |
| `GAME_CURRENCY_CODE` / `GAME_DEFAULT_LANGUAGE` | Launch defaults |
| `GAME_MIN_LAUNCH_BALANCE` | Min main-wallet balance to launch (default 100) |
| `GAME_HTTP_TIMEOUT` | Outbound aggregator timeout (seconds) |

The aggregator posts callbacks to `${GAME_CALLBACK_BASE_URL}/api/v1/games/callback`.

---

## 3. Data model

Schema and seed data live in `database/init.sql` (import that file for new tenant
databases):

- **`games`** (extended): `game_uid` (aggregator UID, indexed), `game_type`,
  `is_active` (per-game launch toggle).
- **`wallets`** (extended): `wagering_balance` (replaces legacy
  `tbl_requiredplay_balance` — outstanding wagering requirement before withdraw).
- **`game_sessions`**: one per launch; accumulates settlement totals
  (`total_bet`, `total_win`, `profit_loss`, `rounds_count`, `status`).
- **`game_rounds`**: one settled bet/win event. **`serial_number` is UNIQUE** —
  the database-level idempotency key.
- **`game_callback_logs`**: raw + decrypted audit of every callback (replaces the
  legacy `bet_logs.txt` file), with the processing result.

Global on/off switch (legacy `GAME_STATUS`) is stored in `platform_settings` under
key `game_status` and read/written via `GameSettingsRepository`.

---

## 4. API

### Player endpoints (JWT, role `user`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/games/launch` | Get a launch URL + open a session |
| GET | `/api/v1/games/history` | Paginated session/play history |
| GET | `/api/v1/games/pnl` | Aggregate betting profit/loss |

`POST /games/launch` accepts both new (`gameUid`, `gameName`) and legacy
(`GAME_UID`, `GAME_NAME`) keys for frontend compatibility. Response:

```json
{ "status_code": "success",
  "data": { "game_url": "https://…", "session_uid": "GS…",
            "game_name": "Aviator", "game_uid": "a04d…" } }
```

Launch error codes (mapped to HTTP status): `auth_error` (401), `account_error`
(403), `game_off` (403), `invalid_params` (400), `game_not_found` (404),
`balance_error` (402), `server_error` (502).

### Aggregator callback (no JWT — auth is the AES payload)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/games/callback` | Inbound bet/win settlement |

Returns the aggregator-shaped encrypted ack `{ code, msg, payload }` where
`payload` decrypts to `{ credit_amount, timestamp }`.

### Admin endpoints (JWT, role `admin`/`super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/games` | Catalog (incl. `game_uid`, `is_active`) |
| POST | `/api/v1/admin/games/create` | Create a game |
| PATCH | `/api/v1/admin/games/{id}` | Update a game |
| GET | `/api/v1/admin/games/status` | Read master games switch |
| PUT | `/api/v1/admin/games/status/set` | `{ "enabled": true|false }` |
| GET | `/api/v1/admin/games/statistics` | 24h/all-time GGR + active sessions |
| GET | `/api/v1/admin/games/pnl-series?days=7` | Daily bet/win/GGR series |
| GET | `/api/v1/admin/games/top?limit=10` | Most-wagered games leaderboard |
| GET | `/api/v1/admin/games/rounds` | Searchable round history |

---

## 5. Callback settlement guarantees

`game_services.process_callback` is the security-critical path:

1. **Decrypt** the envelope (`services.game_provider.parse_callback`).
2. **Validate** the payload (`CallbackPayload.parse`).
3. **Resolve** the user by stripping the player prefix from `member_account`.
4. **Heartbeat**: if `bet == win == 0`, return the current balance, no writes.
5. **Idempotency pre-check**: known `serial_number` → re-ack, no settlement.
6. **Settle** under `SELECT … FOR UPDATE` on the wallet row, inside
   `tenant_atomic()`:
   - Insert the `game_round` first; the UNIQUE `serial_number` constraint makes a
     racing duplicate raise `IntegrityError` **before** any money moves (caught and
     treated as an idempotent success).
   - Apply `net = win - bet` to `main_balance`; decrement `wagering_balance` by the
     wagered amount (floored at 0).
   - Accumulate the session totals and set `profit`/`loss` status.
   - Write a `bet_settlement` `Transaction` (ledger) referencing the serial.
7. **Audit**: every callback (settled/duplicate/heartbeat/error/rejected) is
   recorded in `game_callback_logs`.

Idempotency is enforced at three levels: fast pre-check, unique DB constraint, and
race-loss handling — so duplicate/retried deliveries never double-settle.

---

## 6. Database import

```bash
mysql -u <user> -p <tenant_db> < database/init.sql
```

Includes 7 aggregator providers, 263 games (with thumbnail URLs), platform settings, welcome bonus, and default admin (`superadmin` / `Admin@123`).

Catalog data (263 games with thumbnail URLs) is embedded in `database/init.sql`.
Aggregator `Game Type` values map to
our normalized categories:

| Aggregator type | Category |
|-----------------|----------|
| Slot Game, Slot | `slots` |
| CasinoLive, India Poker Game | `live_casino` |
| Fish Game, CasinoTable | `ai_games` |
| Sport | `sports` |
| SportsGame | `virtual_sports` |

---

## 7. Tests

```bash
python manage.py test core.tests --settings=config.test_settings
```

`config/test_settings.py` uses in-memory SQLite and ORM-built tables (production
applies schema via SQL and disables migrations). Coverage: AES round-trip and
launch envelope (`test_game_provider`), request/callback validation
(`test_game_schemas`), launch + settlement + idempotency + heartbeat + wagering
(`test_game_services`), and route/ack behavior (`test_game_views`).
