# Winco — Games Architecture & Implementation

> **Project:** Winco (winco.cc)  
> **Stack:** React SPA (Vite build) + PHP REST API + MySQL + External Game Aggregator  
> **Last analyzed from:** `assets/index-DQk9JX-S.js`, `api/` backend, `api/security/constants.php`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure](#2-project-structure)
3. [Architecture Overview](#3-architecture-overview)
4. [External Game Provider Integration](#4-external-game-provider-integration)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Backend API — Game Routes](#6-backend-api--game-routes)
7. [Bet Callback & Wallet Settlement](#7-bet-callback--wallet-settlement)
8. [Database Schema](#8-database-schema)
9. [Balance & Withdrawal Rules](#9-balance--withdrawal-rules)
10. [Admin Panel — Game Management](#10-admin-panel--game-management)
11. [Configuration Reference](#11-configuration-reference)
12. [Complete Game Catalog (263 Games)](#12-complete-game-catalog-263-games)

---

## 1. Executive Summary

Winco is a **real-money gaming platform** that does **not host game logic locally**. Instead:

- **263 unique games** are hardcoded in the React frontend bundle as static metadata (name, UID, type).
- When a user clicks a game, the backend requests a **launch URL** from an external aggregator at `https://bet/game/v1`.
- The game runs inside an **iframe** on the `/game-url/:gameUrl/:gameName` route.
- Bets and wins are reported back to Winco via an **encrypted webhook** at `https://api.winco.cc/game/`.
- All play history is stored in MySQL table `tblmatchplayed`.

### Game Categories (unique count)

| Game Type | Count | Description |
|---|-----------|----------|-----------|
| **Slot Game** | 189 | PG Soft, JILI, CQ9-style slot titles |
| **Fish Game** | 18 | Fishing / arcade shooter games |
| **CasinoLive** | 16 | Live dealer lobbies (Evolution, Ezugi, Playtech, etc.) |
| **India Poker Game** | 16 | Teen Patti, Rummy, Andar Bahar, Ludo, etc. |
| **Slot** | 13 | Premium / featured slots (Fortune Tiger, Aviamasters, etc.) |
| **CasinoTable** | 9 | Crash & instant games (Aviator, Mines, Plinko, Dice, etc.) |
| **Sport** | 1 | SABA Sports (main sportsbook) |
| **SportsGame** | 1 | Esports |
| **Total** | **263** | |

---

## 2. Project Structure

```
winco/
├── index.html                    # SPA entry — loads React bundle
├── assets/
│   ├── index-DQk9JX-S.js         # Production React app (games defined here)
│   └── index-BEoY_lMK.css        # Styles
├── api/
│   ├── router/
│   │   ├── index.php             # Main API router (header-based routing)
│   │   └── route-paths.php       # Route â†’ file mapping
│   ├── route-paths/
│   │   ├── request-play-games.php    # Launch game session
│   │   └── load-mygame-records.php   # User bet history
│   ├── game/
│   │   ├── index.php             # Bet/win callback from game server
│   │   └── bet_logs.txt          # Raw callback audit log
│   ├── security/
│   │   ├── constants.php         # AGENCY_UID, AES key, GAME_SERVER_URL
│   │   ├── config.php            # DB connection
│   │   ├── headers-security.php  # AuthToken + Route header handling
│   │   └── setup-database.php    # tblmatchplayed schema
│   └── admin/
│       ├── recent-played/        # Admin view of all bets
│       ├── game-statistics/      # P&L analytics
│       ├── chart/                # Profit/loss charts from tblmatchplayed
│       └── manage-settings/      # GAME_STATUS on/off toggle
└── payments/                     # Recharge gateways (separate from games)
```

> **Note:** A duplicate `winco/winco/` folder exists in the repo with mirrored files. The active deployment paths referenced in constants use `api.winco.cc` and `winco.cc`.

---

## 3. Architecture Overview

```
┌─────────────────┐     POST route-play-games      ┌──────────────────┐
│  React Frontend │ ─────────────────────────────► │  api/router/     │
│  (winco.cc)     │     AuthToken + Route header   │  index.php       │
└────────┬────────┘                                └────────┬─────────┘
         │                                                   │
         │ iframe game_url                                   │ curl POST /game/v1
         ▼                                                   ▼
┌─────────────────┐     bet/win callbacks (encrypted) ┌──────────────────┐
│  External Game  │ ◄────────────────────────────── │  Game Aggregator │
│  (iframe)       │ ──────────────────────────────► │  (https://bet)   │
└─────────────────┘     POST api.winco.cc/game/     └──────────────────┘
         ▲                                                   │
         │                                                   │
         └────────────── user plays in browser ──────────────┘
```

### End-to-end flow

1. **User logs in** â†’ `auth_secret_key` and `account_id` stored in `sessionStorage`.
2. **User selects a game** from the home/catalog UI.
3. **Frontend** sends `POST https://api.winco.cc/router/` with:
   - Header `Route: route-play-games`
   - Header `AuthToken: <user secret>`
   - Body: `{ USER_ID, GAME_NAME, GAME_UID }`
4. **Backend** validates user, balance (min ₹100), `GAME_STATUS`, then calls aggregator.
5. **Aggregator** returns `game_launch_url` in encrypted payload.
6. **Frontend** navigates to `/game-url/<encoded_url>/<encoded_name>` and loads iframe.
7. **During play**, aggregator POSTs bet/win events to `api/game/index.php`.
8. **Callback handler** updates `tbl_balance`, `tbl_requiredplay_balance`, and `tblmatchplayed`.

---

## 4. External Game Provider Integration

### Provider constants (`api/security/constants.php`)

| Constant | Value | Purpose |
|---|-----------|----------|-----------|
| `$AGENCY_UID` | `d28a8d5f4fa53910826caa6640925239` | Agency identifier for aggregator |
| `$AES_SECRET_KEY` | `1f806d609f1ef42a131a187d1509ca98` | AES-256-ECB encrypt/decrypt |
| `$PLAYER_PREFIX` | `h72add` | Prepended to user ID for `member_account` |
| `$GAME_SERVER_URL` | `https://bet` | Aggregator base URL |
| `$API_TARGET_URL` | `https://api.winco.cc/` | Callback base URL |
| `$API_ACCESS_URL` | `https://winco.cc` | Home URL passed to games |

### Launch API (outbound)

**Endpoint:** `POST {GAME_SERVER_URL}/game/v1`

**Request body:**
```json
{
  "agency_uid": "d28a8d5f4fa53910826caa6640925239",
  "timestamp": 1710000000000,
  "payload": "<AES-256-ECB encrypted base64 string>"
}
```

**Decrypted payload fields:**
```json
{
  "agency_uid": "...",
  "timestamp": 1710000000000,
  "member_account": "h72add<USER_ID>",
  "game_uid": "<32-char hex UID>",
  "credit_amount": "1234.56",
  "currency_code": "INR",
  "language": "en",
  "home_url": "https://winco.cc",
  "platform": "web",
  "callback_url": "https://api.winco.cc/game/"
}
```

**Response:** `{ "code": 0, "payload": { "game_launch_url": "https://..." } }`

### Bet callback API (inbound)

**Endpoint:** `POST https://api.winco.cc/game/`

**Decrypted callback payload (from bet_logs.txt):**
```json
{
  "game_uid": "a04d1f3eb8ccec8a4823bdf18e3f0e84",
  "game_round": "3716537025301331892",
  "bet_amount": "10",
  "win_amount": "0",
  "serial_number": "9c12630d-7c78-3fd4-986b-b9901681cdc0",
  "member_account": "h72add1111111",
  "currency_code": "INR",
  "timestamp": "2025-03-23 12:53:41"
}
```

**Response:**
```json
{
  "code": 0,
  "msg": "",
  "payload": "<encrypted { credit_amount, timestamp }>"
}
```

---

## 5. Frontend Implementation

### Technology

- **React** SPA built with Vite (source not in repo; only minified bundle `assets/index-DQk9JX-S.js`)
- **React Router** for client-side navigation
- **sessionStorage** for auth: `auth_secret_key`, `account_id`, `avl_balance`

### API base URL

```
https://api.winco.cc/router/
```

All API calls use custom headers instead of URL paths:
- `Route: route-play-games` (or other route name)
- `AuthToken: <user auth secret>`

### Game-related routes

| Route | Purpose |
|-------|---------|
| `/game/:gameName` | Game catalog / category view |
| `/game-url/:gameUrl/:gameName` | **Iframe game player** — loads external URL |
| `/transaction` | Transaction history |
| `/betting-profit-loss` | User P&L report |
| `/openbet` | Open bets view |
| `/withdraw` | Withdrawal |
| `/deposit` | Recharge |

### Game data structure (frontend)

Each game is a static object embedded in the JS bundle:

```javascript
{
  "Game Name": "Aviator",
  "Game UID": "a04d1f3eb8ccec8a4823bdf18e3f0e84",
  "Game Type": "CasinoTable"
}
```

### Launching a game (frontend logic)

```javascript
// Simplified from minified bundle
const response = await fetch('https://api.winco.cc/router/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    route: 'route-play-games',
    AuthToken: sessionStorage.getItem('auth_secret_key')
  },
  body: JSON.stringify({
    USER_ID: sessionStorage.getItem('account_id'),
    GAME_NAME: game['Game Name'],
    GAME_UID: game['Game UID']
  })
});

const data = await response.json();
if (data.status_code === 'success' && data.data.game_url) {
  navigate(`/game-url/${encodeURIComponent(data.data.game_url)}/${encodeURIComponent(game['Game Name'])}`);
}
```

### Iframe player

The `/game-url/:gameUrl/:gameName` page renders:

```jsx
<iframe
  src={decodeURIComponent(gameUrl)}
  title={decodeURIComponent(gameName)}
  className="w-full h-full border-0"
  allow="fullscreen"
/>
```

### Sportsbook (SABA Sports)

The default featured sports entry uses:

```javascript
Ku = {
  "Game Name": "SABA Sports",
  "Game UID": "08ced9dd788aed11ff3c7f387ae0f063",
  "Game Type": "Sport"
}
```

Sports sub-categories (UI filter buttons, not separate game UIDs):
Cricket, Football, Live, Avatar, Tennis, Basketball, Hockey, Rugby, Esports, MMA, Boxing, Volleyball

### Game history (frontend)

Fetches via `GET https://api.winco.cc/router/?USER_ID=<id>` with `Route: route-mygame-records`.

Maps response fields:
- `r_match_name` â†’ game name
- `r_match_amount` â†’ total cost
- `r_match_bet` â†’ amount invested
- `r_match_profit` â†’ winnings
- `r_match_status` â†’ profit / loss / wait

---

## 6. Backend API — Game Routes

### Router (`api/router/index.php`)

- Reads `Route` header to determine handler
- Includes matching file from `api/router/route-paths.php`

### `route-play-games` â†’ `request-play-games.php`

| Check | Behavior |
|-------|----------|
| Auth | `USER_ID` + `AuthToken` must match `tblusersdata` |
| Account | `tbl_account_status` must be `true` |
| Game toggle | `tblservices.GAME_STATUS` must be `true` |
| Min balance | `tbl_balance >= 100` |

**On success:**
1. Calls aggregator `/game/v1` with encrypted payload
2. Inserts row into `tblmatchplayed` (once per user + game UID per day)
3. Returns `{ status_code: "success", data: { game_url: "..." } }`

**Error codes:** `authorization_error`, `invalid_params`, `auth_error`, `account_error`, `game_off`, `balance_error`, `server_error`, `sql_failed`

### `route-mygame-records` â†’ `load-mygame-records.php`

- **Method:** GET with `?USER_ID=`
- **Auth:** AuthToken header
- **Pagination:** 40 records per page
- **Returns:** Array of match records from `tblmatchplayed`

---

## 7. Bet Callback & Wallet Settlement

**File:** `api/game/index.php`

### Processing logic

1. Decrypt `payload` from POST body using `$AES_SECRET_KEY`
2. Extract `member_account` â†’ strip `$PLAYER_PREFIX` â†’ get `user_id`
3. Read `game_uid`, `bet_amount`, `win_amount`
4. **Heartbeat / balance sync:** If both amounts are 0, return current balance without DB write
5. **Bet settlement:**
   - `updated_balance = balance + win_amount - bet_amount`
   - `tbl_requiredplay_balance += win_amount - bet_amount` (wagering requirement tracking)
6. **Match record update:** Find latest `tblmatchplayed` row for `user_id` + `period_id` (= game_uid)
   - Accumulate `tbl_match_cost`, `tbl_match_profit`, `tbl_invested_on`
   - Set `tbl_match_status` to `profit` or `loss`
7. Log all requests to `api/game/bet_logs.txt`

### Observed real bets (from logs)

| Game UID | Game (mapped) | Sample bets |
|---|-----------|----------|-----------|
| `a04d1f3eb8ccec8a4823bdf18e3f0e84` | Aviator | ₹10–₹200 per round |
| `5c4a12fb0a9b296d9b0d5f9e1cd41d65` | Mines | ₹0.6–₹1000 per round |
| `5b4c3acdabc8ac8f234d6864d2ee3a8a` | (not in current catalog) | Legacy/test UID |

---

## 8. Database Schema

### `tblmatchplayed` — primary game history table

| Column | Type | Description |
|---|-----------|----------|-----------|
| `id` | INT AUTO_INCREMENT | Primary key |
| `tbl_uniq_id` | VARCHAR(100) | Order ID (e.g. `GA0XXXXXXXXXXXXX`) |
| `tbl_user_id` | VARCHAR(100) | User account ID |
| `tbl_period_id` | VARCHAR(50) | **Game UID** from aggregator |
| `tbl_invested_on` | VARCHAR(50) | Cumulative bet per session |
| `tbl_match_cost` | DECIMAL(20,2) | Total amount wagered |
| `tbl_lot_size` | VARCHAR(30) | Lot count |
| `tbl_match_invested` | DECIMAL(20,2) | Invested amount |
| `tbl_match_fee` | DECIMAL(10,2) | Fee |
| `tbl_match_profit` | DECIMAL(20,2) | Total winnings |
| `tbl_match_result` | VARCHAR(30) | Result code |
| `tbl_last_acbalance` | DECIMAL(20,2) | Balance after last action |
| `tbl_match_status` | VARCHAR(15) | `wait` / `profit` / `loss` |
| `tbl_project_name` | VARCHAR(30) | **Game display name** |
| `tbl_time_stamp` | VARCHAR(50) | `d-m-Y h:i a` format |

### `tblservices` — game toggle

| Service | Default | Description |
|---|-----------|----------|-----------|
| `GAME_STATUS` | `true` | Master on/off for all games |

### `tblusersdata` — wallet fields affected by games

| Column | Game impact |
|--------|-------------|
| `tbl_balance` | Main wallet — debited/credited on bet/win |
| `tbl_requiredplay_balance` | Wagering requirement before withdraw |
| `tbl_withdrawl_balance` | Withdrawable portion (separate tracking) |

---

## 9. Balance & Withdrawal Rules

From `api/security/constants.php` and `request-withdrawl.php`:

| Rule | Value |
|------|-------|
| Min balance to play | ₹100 |
| Required play mode | `$IS_REQUIREDPLAY_BALANCE_MODE = true` |
| Withdraw blocked if | `tbl_requiredplay_balance > 0` |
| Gameplay verification | Total bets in `tblmatchplayed` must cover recharge bonus obligations |

When user **recharges**, `tbl_requiredplay_balance` increases by recharge amount (must be wagered before withdrawal).

When user **bets**, `requiredplay_balance` decreases by net loss or increases by net win same as main balance.

---

## 10. Admin Panel — Game Management

**Base URL:** `https://api.winco.cc/admin/` (or host-dependent)

| Page | Path | Function |
|---|-----------|----------|-----------|
| Dashboard | `dashboard/` | Recent 20 plays, 24h P&L from `tblmatchplayed` |
| Recently Played | `recent-played/` | Searchable bet history, export PDF |
| Chart Data | `chart/` | 7-day profit/loss/cost charts |
| Game Statistics | `game-statistics/` | Daily P&L vs recharge/withdraw |
| Manage Settings | `manage-settings/?id=GAME_STATUS` | Toggle games on/off |
| User Activities | `users-data/view-activities.php` | Per-user game history |

### Admin permissions related to games

- `access_recent_played` — view bet records
- `access_match_control` — match/game control dialog
- `access_pandl` — profit & loss reports
- `access_settings` — GAME_STATUS toggle

### Match control dialog

`api/admin/components/dialog-control-match.php` provides a UI shell for updating game/match settings (used with admin JS callbacks).

---

## 11. Configuration Reference

### Enable / disable all games

```sql
UPDATE tblservices SET tbl_service_value = 'false' WHERE tbl_service_name = 'GAME_STATUS';
```

Or via Admin â†’ Manage Settings â†’ GAME_STATUS.

### Add a new game

1. Obtain `Game UID` from the aggregator provider
2. Add object to frontend game array: `{ "Game Name": "...", "Game UID": "...", "Game Type": "..." }`
3. Rebuild and deploy React bundle to `assets/`
4. No backend code change required (UID is passed through dynamically)

### Key files to modify

| Task | File(s) |
|------|---------|
| Change aggregator URL/keys | `api/security/constants.php` |
| Change min play balance | `api/route-paths/request-play-games.php` (line 78) |
| Change bet settlement logic | `api/game/index.php` |
| Add/remove games | Frontend source â†’ rebuild `assets/index-*.js` |
| Game on/off switch | `tblservices.GAME_STATUS` or admin settings |

---

## 12. Complete Game Catalog (263 Games)

Below is the full list extracted from the production frontend bundle. Each game is identified by a **32-character hex UID** used when calling the aggregator.


### CasinoLive (16 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Microgaming Lobby | `4e58131adb95bb061a40e6e309116c19` | https://bc.imgix.net/game/image/97a368dcf8.png?_v=4&auto=format&dpr=1.125&w=200 |
| 2 | Ezugi Lobby | `d0e052b031dfcdb08d1803f4bcc618ef` | https://bc.imgix.net/game/image/24d4df39d5.png?_v=4&auto=format&dpr=1.125&w=200 |
| 3 | Evolution Lobby | `8ef39602e589bf9f32fc351b1cbb338b` | https://bc.imgix.net/game/image/9e20f4796d.png?_v=4&auto=format&dpr=1.125&w=200 |
| 4 | Super Andar Bahar | `f7b98e899461bdd49f92afc36b4c0db5` | https://i.postimg.cc/nzJXysKD/Screenshot-2025-03-21-153431.png |
| 5 | XXXtreme Lightning Roulette | `394fe6a2cde24bc487767236cc6eccd6` | https://bc.imgix.net/game/image/211bf0ceb5.png?_v=4&auto=format&dpr=1.125&w=200 |
| 6 | Crazy Time | `917c0c51d248c33eb058e3210a2e7371` | https://i.postimg.cc/tJ9Vx1Yj/Screenshot-2025-03-21-153400.png |
| 7 | Lightning Roulette | `4a858d6b74c05260d3ea2762838798c7` | https://bc.imgix.net/game/image/60af55899a.png?_v=4&auto=format&dpr=1.125&w=200 |
| 8 | MONOPOLY Live | `d496ac5fd91702331133e44b6bd12b26` | https://bc.imgix.net/game/image/9f7426d382.png?_v=4&auto=format&dpr=1.125&w=200 |
| 9 | Playtech Lobby | `c38efc51028bd65f42396fa079c125d6` | https://www.primeapi.com/cdn/gameRes/sq/350/PlaytechGameShowsLobby.jpg |
| 10 | DreamGaming | `8737e1ef982bd7ba41ec02c1823626f9` | https://www.khotsian.com/wp-content/uploads/2021/10/dreaming-khotsian.png |
| 11 | Mines | `72ce7e04ce95ee94eef172c0dfd6dc17` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/232.png |
| 12 | Tower | `8e939551b9e785001fcb5b0a32f88aba` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/233.png |
| 13 | HILO | `bd8a2bb2dd63503b93cf6ac9492786ce` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/235.png |
| 14 | Limbo | `eabf08253165b6bb2646e403de625d1a` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/236.png |
| 15 | Trump Card | `96c010fc4a95792401e903213d7add44` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Trump-Card.png |
| 16 | Wheel | `6e19e03c50f035ddd9ffd804c30f8c80` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png |

### CasinoTable (9 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Aviator | `a04d1f3eb8ccec8a4823bdf18e3f0e84` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/800.png |
| 2 | Mines | `5c4a12fb0a9b296d9b0d5f9e1cd41d65` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22005.png |
| 3 | Plinko | `6ab7a4fe5161936012d6b06143918223` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22004.png |
| 4 | Dice | `8a87aae7a3624d284306e9c6fe1b3e9c` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/102.png |
| 5 | Goal | `c68a515f0b3b10eec96cf6d33299f4e2` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/105.png |
| 6 | Hi Lo | `a669c993b0e1f1b7da100fcf95516bdf` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/101.png |
| 7 | Hotline | `b31720b3cd65d917a1a96ef61a72b672` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/107.png |
| 8 | Keno | `c311eb4bbba03b105d150504931f2479` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/106.png |
| 9 | Mini Roulette | `9dc7ac6155c5a19c1cc204853e426367` | https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/104.png |

### Fish Game (18 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Ocean King Jackpot | `564c48d53fcddd2bcf0bf3602d86c958` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ocean-King-Jackpot.png |
| 2 | Royal Fishing | `e794bf5717aca371152df192341fe68b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Royal-Fishing.png |
| 3 | Bombing Fishing | `e333695bcff28acdbecc641ae6ee2b23` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bombing-Fishing.png |
| 4 | Dinosaur Tycoon | `eef3e28f0e3e7b72cbca61e7924d00f1` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon.png |
| 5 | Jackpot Fishing | `3cf4a85cb6dcf4d8836c982c359cd72d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jackpot-Fishing.png |
| 6 | Dragon Fortune | `1200b82493e4788d038849bca884d773` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Fortune.png |
| 7 | Mega Fishing | `caacafe3f64a6279e10a378ede09ff38` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Fishing.png |
| 8 | Boom Legend | `f02ede19c5953fce22c6098d860dadf4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Boom-Legend.png |
| 9 | Happy Fishing | `71c68a4ddb63bdc8488114a08e603f1c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Fishing.png |
| 10 | All-star Fishing | `9ec2a18752f83e45ccedde8dfeb0f6a7` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/All-star-Fishing.png |
| 11 | Dinosaur Tycoon II | `bbae6016f79f3df74e453eda164c08a4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon-II.png |
| 12 | Fishing Disco | `e453b811fd1782fd2ade1f93ee0dee32` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Disco.png |
| 13 | Dragon Master | `f691d904ea681ce449263f7e9cc47c35` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Master.png |
| 14 | Fishing Yilufa | `877c97367d24925a11d342726eb0320f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Yilufa.png |
| 15 | Shade Dragons Fishing | `89e967a8336fb8caad2c1b6d735588fe` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Shade-Dragons-Fishing.png |
| 16 | Cai Shen Fishing | `6df463eabe5fcdaa033e1c89b9ffd162` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Cai-Shen-Fishing.png |
| 17 | Dragon Fishing II | `6cef8d8ea517d86602db60fe9781b01b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing-Ii.png |
| 18 | Dragon Fishing | `1145d7cd96518a5ba2f77cb14cb363c4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing.png |

### India Poker Game (16 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | TeenPatti | `f743cb55c2c4b737727ef144413937f4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti.png |
| 2 | AK47 | `488c377662cad37a551bde18e2fbe785` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/AK47.png |
| 3 | Andar Bahar | `6f48b3aa0b64c79a2dc320ea021148b5` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Andar-Bahar.png |
| 4 | Rummy | `ae632f32c3a1e6803f9a6fbec16be28e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Rummy.png |
| 5 | Callbreak | `9092b5a56e001c60850c4c1184c53e07` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak.png |
| 6 | TeenPatti Joker | `1a4eaca67612e65fdcae43f4c8a667a4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-Joker.png |
| 7 | Callbreak Quick | `aa9a9916d6e48ba50afa3c2246b6dacb` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak-Quick.png |
| 8 | TeenPatti 20-20 | `1afa7db588d05de7b9abca4664542765` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-20-20.png |
| 9 | Ludo Quick | `bb1f14d788d37b06dc8f6701ed57ed0d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ludo-Quick.png |
| 10 | Tongits Go | `26fbfab92a3837b7dbf767e783b173af` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Tongits-Go.png |
| 11 | Pusoy Go | `f2879a3f20f305eadad13448e11c052e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pusoy-Go.png |
| 12 | Blackjack | `3b502aee6c9e1ef0f698332ee1b76634` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack.png |
| 13 | Blackjack Lucky Ladies | `d0d1c20062e28493e1750f27a1730c48` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack-Lucky-Ladies.png |
| 14 | MINI FLUSH | `07afefc388ab6af8cf26f85286f83fae` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/MINI-FLUSH.png |
| 15 | Pool Rummy | `43e7df819bf57722a8917bb328640b30` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pool-Rummy.png |
| 16 | Caribbean Stud Poker | `04c9784b0b1b162b2c86f9ce353da8b7` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Caribbean-Stud-Poker.png |

### Slot (13 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Le Pharaoh | `fd4d50fd42d7453c20776398269ee6c5` | https://mediumrare.imgix.net/293b2337d4d5cfda999ca423e34518a1a6682062340f1f1c5a669a26e7927c79?w=180&h=236&fit=min&auto=format |
| 2 | Phoenix DuelReels | `32776cbf601015f626a96ccecb1137d9` | https://mediumrare.imgix.net/7ac7169ca980177d2f7843face3046fb42c001bf4dd7356becb037e92fc07ff1?w=180&h=236&fit=min&auto=format |
| 3 | Fortune Dragon | `c5435a8a73707a3a8bb4fe8baaaef3d2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fortune-Dragon_icon_1024_rounded.png |
| 4 | Fortune Rabbit | `e175cdd3215a02f5539cc8354a149b75` | https://mediumrare.imgix.net/8f495d55e1cdbef9a5995b7133d6f4ad1b9a332493ade8b29a82f048ecda7388?w=180&h=236&fit=min&auto=format |
| 5 | Fortune Tiger | `9a8482565ce343ad3ea7fc4bc42cb043` | https://mediumrare.imgix.net/38cdf7e275e87c2530ee926bb2f5c811d9cb6ffccdad7717bed7ca43aa88eb38?w=180&h=236&fit=min&auto=format |
| 6 | SixSixSix | `3752490080e5e310b5a3f823de33deed` | https://mediumrare.imgix.net/30be38fdc2b4d9a6c76194314dfb7814a66d6905287ade354a0e5f2a79b1ab27?w=180&h=236&fit=min&auto=format |
| 7 | Le Bandit | `2fbd2533b1bb03d5e03bfa80dd5da0bf` | https://mediumrare.imgix.net/8ade942d35d2cdbddf7888f303be4cf4bda8c650a112b3c53f7c6f3ccad81254?w=180&h=236&fit=min&auto=format |
| 8 | Donny Dough | `173c3e7cb587af08a8aa2026e490b832` | https://mediumrare.imgix.net/d0da486c2ef84196c52198fce55b4566303ef3d73d94c675179a8f6c4c5a3781?w=180&h=236&fit=min&auto=format |
| 9 | Magic Piggy | `a1686de737ae9cd841d500c825720778` | https://mediumrare.imgix.net/b18560b8631fc3b27c06d41e9729f7774048864ad7c4a16d1a20b1a953883943?w=180&h=236&fit=min&auto=format |
| 10 | Wild Bandito | `95fc290bb05c07b5aad1a054eba4dcc4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Bandito_icon_1024_rounded.png |
| 11 | Aviamasters | `d3c7985229b2e4651fa7889445a5bfd8` | https://mediumrare.imgix.net/202834625f09f92dc0213a6f046d5111bcbba4aec9abf2d1b896839b592c657d?w=180&h=236&fit=min&auto=format |
| 12 | RIP City | `784f4587c36ec560939eef1b85c639e4` | https://mediumrare.imgix.net/c55c2ec37c310140617b75c9e490faca98090292991840dce959d93649efbfa5?w=180&h=236&fit=min&auto=format |
| 13 | FRKN Bananas | `7e6130a781f047045e7b92638d8e3fca` | https://mediumrare.imgix.net/d4c903b8aa3bcbcd3e7cfdd46e14fa5ff3f056922cd470a109438ee41184990e?w=180&h=236&fit=min&auto=format |

### Slot Game (189 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Mahjong Ways | `1189baca156e1bbbecc3b26651a63565` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways_rounded_1024.png |
| 2 | Mahjong Ways 2 | `ba2adf72179e1ead9e3dae8f0a7d4c07` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways2_rounded_1024.png |
| 3 | Treasures of Aztec | `2fa9a84d096d6ff0bab53f81b79876c8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Treasures-of-Aztec_rounded_1024.png |
| 4 | Leprechaun Riches | `fb2a2ac51303c0a0801dbe6a72d936f7` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Leprechaun-Riches_rounded_1024.png |
| 5 | Lucky Neko | `e1b4c6b95746d519228744771f15fe4b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Neko_icon_1024_rounded.png |
| 6 | Captain's Bounty | `cd29b9906a852ce26b53b6d6d81037d4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Captains-Bounty_Icon_Rounded_1024.png |
| 7 | Queen of Bounty | `83a6890cf84e4c5a6bacf96d5355d472` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Queen-of-Bounty_1024_rounded.png |
| 8 | Ways of the Qilin | `fedfca553a97a791a3a41c4f1e3bff58` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ways-of-the-Qilin_icon_1024_rounded.png |
| 9 | Dragon Hatch | `4afef91d3addb9ce5107abaf3342b9a5` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch_rounded_1024.png |
| 10 | Chin Shi Huang | `24da72b49b0dd0e5cbef9579d09d8981` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Chin-Shi-Huang.png |
| 11 | God Of Martial | `21ef8a7ddd39836979170a2e7584e333` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/God-Of-Martial.png |
| 12 | Hot Chilli | `c845960c81d27d7880a636424e53964d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hot-Chilli.png |
| 13 | Fortune Tree | `6a7e156ceec5c581cd6b9251854fe504` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Tree.png |
| 14 | War Of Dragons | `4b1d7ffaf9f66e6152ea93a6d0e4215b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/War-Of-Dragons.png |
| 15 | Gem Party | `756cf3c73a323b4bfec8d14864e3fada` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gem-Party.png |
| 16 | Lucky Ball | `893669898cd25d9da589a384f1d004df` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Ball.png |
| 17 | Mafia Mayhem | `c7b3016c70a06ddbb2355a3aee4179d0` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mafia-Mayhem_1024_rounded.png |
| 18 | Werewolf Hunt | `2ac70bee7b47c172381e55f7e644d92e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Werewolfs-Hunt_icon_1024_rounded.png |
| 19 | Tsar Treasures | `1eb6a959aadf0491f4a648762d8d262a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Tsar-Treasures_icon_1024_rounded.png |
| 20 | Dragon Hatch 2 | `910f25689073d17680be453d7ed90ce2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch2_icon_1024_rounded.png |
| 21 | Gemstones Gold | `877c9b2ec1c5e0505129315948f9bbfa` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gemstones-Gold_appicon_rounded.png |
| 22 | Cash Maniac | `8bbb41367b3971ed3467c2f0c2627a4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cash-Mania_appicon_rounded.png |
| 23 | Wild Ape # | `2589b93cb0dc46d847864c87ed42a3428bb` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Ape_rounded.png |
| 24 | Pinata Wins | `f08cc025e23ee049b570517867c74be0` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Pinata-Wins_1024_rounded.png |
| 25 | Mystic Potion | `e61bde75d590e943d2c5c6d432b29b46` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystic-Potion.png |
| 26 | Hawaiian Tiki | `35d6743ae5d73a3359f143cbb44ede09` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Hawaiian-Tiki_icon_1024_rounded.png |
| 27 | Bakery Bonanza | `d0fe7aa2f7ed5778190b1e60d94e6773` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Bakery-Bonanza_app-Icon_1024_rounded.png |
| 28 | Songkran Splash | `894b1c7609629cf9b3d127d9dbaa372c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Songkran-Splash_appicon_rounded.png |
| 29 | Mystical Spirits | `3b2d4d1ae24b1c3ad29556a6cf875f11` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystical-Spirits_icon_1024_rounded.png |
| 30 | Super Golf Drive | `d37dde2adb52e0ea708c0ccd6877b1b3` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Super-Golf-Drive_icon_1024_rounded.png |
| 31 | Lucky Clover Lady | `288f290554746bb32322a79b96ecdcbb` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Clover-Lady_1024_rounded.png |
| 32 | Fruity Candy | `9f2c89ae5b7c0894c9ee9e223e3fd9d8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fruity-Candy_1024_rounded.png |
| 33 | Cruise Royale | `8489d662ccc07a2e9677729f76e26ae8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cruise-Royale_icon_1024_rounded.png |
| 34 | Safari Wilds | `97c6f05ef6a0a34cad10d5e00edc909c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Safari-Wilds_appicon_rounded.png |
| 35 | Gladiator's Glory | `2454dc7cfdc651b7318950453bc3f617` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gladiators-Glory_appicon_1024_rounded.png |
| 36 | Ninja Racoon Frenzy | `6d1937d2e7f87306333443c99ac2c03f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ninja-Racoon-Frenzy_1024_rounded.png |
| 37 | Ultimate Striker | `4415d83cd9c74299814c1473db83bf7f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ultimate-Striker_appicon_rounded.png |
| 38 | Mermaid Riches | `a9d7a5af417a94caf554170e6b345e57` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mermaid-Riches-icon_1024_rounded.png |
| 39 | Raider Jane's Crypt of Fortune | `24d8e1dbc5cface0907f5a21ecd56753` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Raider-Janes-Crypt-of-Fortune_1024_rounded.png |
| 40 | Supermarket Spree | `7ef03497fc0b21c34b137e85b1e409cd` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Supermarket-Spree_rounded_1024.png |
| 41 | Buffalo Win | `818a7add6e10b2ec5f938d7ae0efb04` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Buffalo-Win_icon_1024_rounded.png |
| 42 | Legendary Monkey King | `5cdeba2ab48d6ba345b1a4de8e2776b5` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Legendary-Monkey-King_icon_1024_rounded.png |
| 43 | Spirited Wonders | `87a05c81af5635bed41765bfd076ee15` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Spirited-Wonders_app-icon_rounded.png |
| 44 | Emoji Riches | `101ca3ff83b149dcf3439309e9b32142` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Emoji-Riches_app-Icon_1024_rounded.png |
| 45 | Mask Carnival | `adf297c2666c69b3abc3b61618d593b8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mask-Carnival_app-icon_rounded.png |
| 46 | Oriental Prosperity | `23b43b58e11aadb1f27fd05ba41e9819` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Oriental-Prosperity_icon_1024_rounded.png |
| 47 | Garuda Gems | `aa609892f551de2053e92427dc4ae17f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Garuda-Gems_1024_rounded.png |
| 48 | Destiny of Sun & Moon | `617ca04ffcffbc543a1a30cacdac98fa` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Destiny-of-Sun-and-Moon_icon_1024_rounded.png |
| 49 | Butterfly Blossom | `116989bb267a72035bd01818c5496126` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Butterfly-Blossom_1024_rounded.png |
| 50 | Rooster Rumble | `5c371d9fca6109c954de93ac7986c5db` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Rooster-Rumble_app-icon_rounded.png |
| 51 | The Queen's Banquet | `1b317b5f8bf2ca0cc609307810407426` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/The-Queens-Banquet_icon_1024_rounded.png |
| 52 | Battleground Royale | `e9f92f6edc2dac2d08bc345ee036260c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Battleground-Royale_icon_1024_rounded.png |
| 53 | Win Win Fish Prawn Crab | `9b344f0b2a9bda427684be60597d2fc6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Win-Win-Fish-Prawn-Crab_rounded_1024.png |
| 54 | Lucky Piggy | `66fadac68ed45e23def86c06cc811820` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Piggy_icon_1024_rounded.png |
| 55 | Wild Coaster | `a06f1a154698243bf2484853d38e5fbb` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Coaster_app-icon_rounded.png |
| 56 | Totem Wonders | `a03c6e7a918132b50f9caa297df1752d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Totem-Wonders_icon_1024_rounded.png |
| 57 | Alchemy Gold | `9860c865264dcacad1ef37176cdefc1a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Alchemy-Gold_1024_rounded.png |
| 58 | Asgardian Rising | `08d92dc2ca14f42c681b44297386d600` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Asgardian-Rising_appicon_rounded.png |
| 59 | Midas Fortune | `a2fd6b0cadc8fefccfb0d063b1f81d85` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Midas-Fortune_appicon_rounded.png |
| 60 | Hyper Burst | `a47b17970036b37c1347484cf6956920` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hyper-Burst.png |
| 61 | Shanghai Beauty | `795d0cae623cbf34d7f1aa93bbcded28` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Shanghai-Beauty.png |
| 62 | Fa Fa Fa | `54c41adcf43fdb6d385e38bc09cd77ca` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fa-Fa-Fa.png |
| 63 | Dragon Soar | `9341a18d096ad901ef77338998f29098` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Soar.png |
| 64 | Pop Pop Candy | `fde142e65f14da39f784e9e5325e0a77` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pop-Pop-Candy.png |
| 65 | Open Sesame Mega | `cb5e57be0354264c6c7ea0cdf4eb18b3` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Open-Sesame-Mega.png |
| 66 | Fruity Bonanza | `f5d6b418b755f3aefe3b9828f3112c9c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fruity-Bonanza.png |
| 67 | Caishen Coming | `45ecec5dd5077785e7a09988b95bbd24` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Caishen-Coming.png |
| 68 | Coocoo Farm | `d1f17fd51e474b0e72892332ea551ba1` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Coocoo-Farm.png |
| 69 | Elemental Link Water | `b84274cdfa5731945a34bfd0db1ddeea` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Water.png |
| 70 | Elemental Link Fire | `46016a772b92c7f47dfdc5873f184ef1` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Fire.png |
| 71 | Birdsparty Deluxe | `786d1cd7f4fa9905c825378292f1204c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Birdsparty-Deluxe.png |
| 72 | Moneybags Man 2 | `33c862e7db9e0e59ab3f8fe770f797da` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man-2.png |
| 73 | JumpHigh | `630a841b4cf75a38e2e657040f785e63` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/JumpHigh.png |
| 74 | Rave Jump | `b602205d6a56d999df188e17ecc2bc91` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Rave-Jump.png |
| 75 | Jump High 2 | `8d57ec6274960fe2f2c252f4a49adf7f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jump-High-2.png |
| 76 | Jumping Mobile | `1282953e9452fe2852cb1724b4b9d617` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jumping-mobile.png |
| 77 | Good Fortune M | `50568ba2a8da9f30dded83dbbd3655d6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Good-Fortune-M.png |
| 78 | God of War | `f4b6484dc2b96fc339604446cd042534` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/God-of-War.png |
| 79 | FlyOut | `afddbebb27c4b7408bda624aa9354aa7` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/FlyOut.png |
| 80 | Emperor Qin | `d58b1c2dd6456da42b2c1a33c70c1630` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-emperorqin.png |
| 81 | Cracker | `b6668f2abcfff3f7f78ae92fe908f99f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-cracker.png |
| 82 | FaFaFa | `017c1edeaf54d4684d675055c44a6f7e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-fafafa.png |
| 83 | Gold Toad | `654155802c34cee717e943c4e2bb6bfe` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goldtoad.png |
| 84 | Lion Legend | `eb8dd621ea38d742ff846362a9b1085d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-lionlegend.png |
| 85 | Goblin's Gold | `697993800419bf160901aa9133cde524` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goblingold.png |
| 86 | The Unsurpassed Grace | `bf0ae3c404807429451d088725ae5377` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-theunsurpassedgrace.png |
| 87 | Arctic King | `8249b0e703ceb0816f3645dbac0a83ce` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-arcticking.png |
| 88 | Jalapeno | `f23ad5acc6c690a45f1280ba49d28266` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-jalapeno.png |
| 89 | Ice Age Mammoths | `484025f23c821e32fc6ac31ff75613d6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-iceagemammoths.png |
| 90 | Cracker | `4415afc357ffd90adfae34b7fc3217d0` | https://dl.kz344.net/game-icon/agg_ht-cracker.png |
| 91 | EstateRichman | `99aa40727eebf03285f0b41492ad3200` | https://dl.kz344.net/game-icon/agg_ht-estaterichman.png |
| 92 | CaribbeanTreasure | `186ceb140e9248012244381fc169640b` | https://dl.kz344.net/game-icon/agg_ht-caribbeantreasure.png |
| 93 | LittleWitch | `f41dd1fabc4700025036ffd090358402` | https://dl.kz344.net/game-icon/agg_ht-thelittlewitch.png |
| 94 | FlameWolves | `6ed7442a8144c29321d95168ef6cb3de` | https://dl.kz344.net/game-icon/agg_ht-flamewolves.png |
| 95 | PersianEmpire | `b4a0d38bac2760d3b2539430b3d65c6b` | https://dl.kz344.net/game-icon/agg_ht-persianempire.png |
| 96 | Heracles | `3be4c3abed248df43bee04af55c7894e` | https://dl.kz344.net/game-icon/agg_ht-heracles.png |
| 97 | Poseidon | `7b5698f1ab2aef819bea060ae5836c6d` | https://dl.kz344.net/game-icon/agg_ht-poseidon.png |
| 98 | GoldenMaitreya | `19565e4f0152c29bc3c05d44ffe316d2` | https://dl.kz344.net/game-icon/agg_ht-goldenmaitreya.png |
| 99 | GoldenWuZeTian | `e5e9c0eae20cdecc45c9287b93e00d4d` | https://dl.kz344.net/game-icon/agg_ht-goldenwuzetian.png |
| 100 | Sweet Land | `91250a55f75a3c67ed134b99bf587225` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sweet-Land.png |
| 101 | Cricket King 18 | `dcf220f4e3ecca0278911a55e6f11c77` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-King-18.png |
| 102 | Elf Bingo | `5cec2b309a8845b38f8e9b4e6d649ea2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Elf-Bingo.png |
| 103 | Cricket Sah 75 | `6720a0ce1d06648ff390fbea832798a9` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-Sah-75.png |
| 104 | Golden Temple | `976c5497256c020ac012005f6bb166ad` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Temple.png |
| 105 | Devil Fire | `1b4c5865131b4967513c1ee90cba4472` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Devil-Fire.png |
| 106 | Bangla Beauty | `6b60d159f0939a45f7b4c88a9b57499a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bangla-Beauty.png |
| 107 | Aztec Priestess | `6acff19b2d911a8c695ba24371964807` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Aztec-Priestess.png |
| 108 | Fortune Monkey | `add95fc40f1ef0d56f5716ce45a56946` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Monkey.png |
| 109 | Dabanggg | `5404a45b06826911c3537fdf935c281f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dabanggg.png |
| 110 | Sin City | `830cac2f5da6cc1fb91cfae04b85b1e2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sin-City.png |
| 111 | King Arthur | `fafab1a17a237d0fc0e50c20d2c2bf4c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/King-Arthur.png |
| 112 | Charge Buffalo Ascent | `28bc4a33c985ddce6acd92422626b76f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo-Ascent.png |
| 113 | Witches Night | `82c5c404cf4c0790deb42a2b5653533c` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Witches-Night.png |
| 114 | Mega Ace | `eba92b1d3abd5f0d37dfbe112abdf0e2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Ace.png |
| 115 | Medusa | `2c17b7c4e2ce5b8bebf4bd10e3e958d7` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Medusa.png |
| 116 | Book of Gold | `6b283c434fd44250d83b7c2420f164f9` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Book-of-Gold.png |
| 117 | Thor X | `7e6aa773fa802aaa9cb1f2fac464736e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Thor-X.png |
| 118 | Happy Taxi | `1ed896aae4bdc78c984021307b1dd177` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Taxi.png |
| 119 | Gold Rush | `2a5d731e0fd60f52873a24ece11f2c0b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gold-Rush.png |
| 120 | Mayan Empire | `5c2383ef253f9c36dacec4b463d61622` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mayan-Empire.png |
| 121 | Crazy Pusher | `00d92d5cec10cf85623938222a6c2bb6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Pusher.png |
| 122 | Bone Fortune | `aab3048abc6a88e0759679fbe26e6a8d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bone-Fortune.png |
| 123 | JILI CAISHEN | `11e330c2b23f106815f3b726d04e4316` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/JILI-CAISHEN.png |
| 124 | Bonus Hunter | `39775cdc4170e56c5f768bdee8b4fa00` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bonus-Hunter.png |
| 125 | World Cup | `28374b7ad7c91838a46404f1df046e5a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/World-Cup.png |
| 126 | Samba | `6d35789b2f419c1db3926350d57c58d8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Samba.png |
| 127 | Neko Fortune | `9a391758f755cb30ff973e08b2df6089` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Neko-Fortune.png |
| 128 | Wild Racer | `2f0c5f96cda3c6e16b3929dd6103df8e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Racer.png |
| 129 | Pirate Queen | `70999d5bcf2a1d1f1fb8c82e357317f4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pirate-Queen.png |
| 130 | Golden Joker | `f301fe0b22d1540b1f215d282b20c642` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Joker.png |
| 131 | Wild Ace | `9a3b65e2ae5343df349356d548f3fc4b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Ace.png |
| 132 | Master Tiger | `d2b48fe98ac2956eeefd2bc4f7e0335a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Master-Tiger.png |
| 133 | Fortune Gems 2 | `664fba4da609ee82b78820b1f570f4ad` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems-2.png |
| 134 | Fortune Gems | `a990de177577a2e6a889aaac5f57b429` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems.png |
| 135 | Crazy Hunter | `69082f28fcd46cbfd10ce7a0051f24b6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Hunter.png |
| 136 | Party Night | `d505541d522aa5ca01fc5e97cfcf2116` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Party-Night.png |
| 137 | Magic Lamp | `582a58791928760c28ec4cef3392a49f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Magic-Lamp.png |
| 138 | Agent Ace | `8a4b4929e796fda657a2d38264346509` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Agent-Ace.png |
| 139 | TWIN WINS | `c74b3cbda5d16f77523e41c25104e602` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TWIN-WINS.png |
| 140 | Ali Baba | `cc686634b4f953754b306317799f1f39` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ali-Baba.png |
| 141 | SevenSevenSeven | `61d46add6841aad4758288d68015eca6` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/SevenSevenSeven.png |
| 142 | Bubble Beauty | `a78d2ed972aab8ba06181cc43c54a425` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bubble-Beauty.png |
| 143 | FortunePig | `8488c76ee2afb8077fbd7eec62721215` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/FortunePig.png |
| 144 | Crazy777 | `8c62471fd4e28c084a61811a3958f7a1` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy777.png |
| 145 | Bao boon chin | `8c4ebb3dc5dcf7b7fe6a26d5aadd2c3d` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bao-boon-chin.png |
| 146 | Night City | `78e29705f7c6084114f46a0aeeea1372` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Night-City.png |
| 147 | Fengshen | `09699fd0de13edbb6c4a194d7494640b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fengshen.png |
| 148 | Crazy FaFaFa | `a57a8d5176b54d4c825bd1eee8ab34df` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-FaFaFa.png |
| 149 | XiYangYang | `5a962d0e31e0d4c0798db5f331327e4f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/XiYangYang.png |
| 150 | DiamondParty | `48d598e922e8c60643218ccda302af08` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/DiamondParty.png |
| 151 | Golden Bank | `c3f86b78938eab1b7f34159d98796e88` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Bank.png |
| 152 | Dragon Treasure | `c6955c14f6c28a6c2a0c28274fec7520` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Treasure.png |
| 153 | Charge Buffalo | `984615c9385c42b3dad0db4a9ef89070` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo.png |
| 154 | Lucky Goldbricks | `d84ef530121953240116e3b2e93f6af4` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Goldbricks.png |
| 155 | Super Ace | `bdfb23c974a2517198c5443adeea77a8` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Super-Ace.png |
| 156 | Money Coming | `db249defce63610fccabfa829a405232` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Money-Coming.png |
| 157 | Golden Queen | `8de99455c2f23f6827666fd798eb80ef` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Queen.png |
| 158 | Jungle King | `4db0ec24ff55a685573c888efed47d7f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jungle-King.png |
| 159 | Monkey Party | `fd369a4a7486ff303beea267ec5c8eff` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Monkey-Party.png |
| 160 | Fortune Neko | `49b706ccfe7c53727ee6760cd9a8721a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Neko.png |
| 161 | Book Of Mystery | `13072a6eb2111c1b5202fe6155227e94` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Book-Of-Mystery.png |
| 162 | Prosperitytiger | `1d704bbb187a113229f3fdaa3b5406fe` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Prosperitytiger.png |
| 163 | Glamorous Girl | `2663e14e5b455525252a25d9bd99e840` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Glamorous-Girl.png |
| 164 | Blossom Of Wealth | `ed6fbaeb7a104dd7ed96fa1683a48669` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Blossom-Of-Wealth.png |
| 165 | Boom Fiesta | `1ffb31ff605f1a7862a138f5cd712056` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Boom-Fiesta.png |
| 166 | Big Three Dragons | `600c338d3fca2da208f1bba2c9d29059` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Big-Three-Dragons.png |
| 167 | Mayagoldcrazy | `6c8009d165293759bb218b72ba3c380f` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mayagoldcrazy.png |
| 168 | Lantern Wealth | `f2f2eae301311f0320ef669b68935546` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lantern-Wealth.png |
| 169 | Marvelous Iv | `126cf2bfe8a8e606b362d23de02c0d5e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Marvelous-Iv.png |
| 170 | Wonder Elephant | `540da2ba4c849fc1c315f43ae74df220` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Wonder-Elephant.png |
| 171 | Lucky Diamond | `6f6867ad1956a04b174c92629cab7f54` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lucky-Diamond.png |
| 172 | Spindrift 2 | `5dc8c7a43305c3fcb43574c570d6378` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift-2.png |
| 173 | Jungle Jungle | `6c5fe548bd6e09b683566298b29510ea` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Jungle-Jungle.png |
| 174 | Dragons Gate | `feaba603992f26633116fb54562e3693` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-Gate.png |
| 175 | Spindrift | `b624d1917ef5a740c151e4904a7cf0dd` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift.png |
| 176 | Double Wilds | `7bd5233c83de0669336ee649e6c8d2b5` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Double-Wilds.png |
| 177 | Moneybags Man | `c4fdebb24ff26fffb3a65d018da8ae92` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man.png |
| 178 | Miner Babe | `e705514fdd4f9bea5f82bbd0b2c0a353` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Miner-Babe.png |
| 179 | Super Niubi Deluxe | `5d940d11c48b64ec1e6a3c8be5228250` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi-Deluxe.png |
| 180 | Funky King Kong | `cdea2d0670bc40309b4a9b6f942a218a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Funky-King-Kong.png |
| 181 | Golden Disco | `dfb8a198ce0e821560cf543387a2acc2` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Golden-Disco.png |
| 182 | Treasure Bowl | `0651af3e73c7600633522ffe15cc175b` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Treasure-Bowl.png |
| 183 | Mjolnir | `e270f0674dff538b181499d18ab47845` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mjolnir.png |
| 184 | Pirate Treasure | `bfb3241e64953f731e72bc833f2fa79a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pirate-Treasure.png |
| 185 | Fortune Treasure | `5a55a19d9cfbead5e64b8169e96bd27a` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Treasure.png |
| 186 | Egypt Treasure | `b7f39e861e2e02633cb5cb08958f1041` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Egypt-Treasure.png |
| 187 | Super Niubi | `4042e5d0c777e1d3c3bd481dac0a867e` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi.png |
| 188 | Dragons World | `00b886803f3d067f7028872468e84745` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-World.png |
| 189 | Go Lai Fu | `a3584394182e8abce362d90c2f048c75` | https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Go-Lai-Fu.png |

### Sport (1 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | SABA Sports | `08ced9dd788aed11ff3c7f387ae0f063` | https://ossimg.tirangaagent.com/Tiranga/vendorlogo/vendorlogo_20240814202959vsy1.png |

### SportsGame (1 games)

| # | Game Name | Game UID | Thumbnail |
|---|-----------|----------|-----------|
| 1 | Esports | `4ee8e0051a035b463b47c3c473ce317d` | https://i.postimg.cc/FHHg66F4/Screenshot-2025-03-21-153241.png |


---

## Appendix A — Status Code Reference

### Play game (`request-play-games.php`)

| status_code | Meaning |
|-------------|---------|
| `success` | Game URL returned |
| `authorization_error` | Missing/invalid AuthToken |
| `invalid_params` | Missing USER_ID, GAME_NAME, or GAME_UID |
| `auth_error` | User not found |
| `account_error` | Account disabled |
| `game_off` | GAME_STATUS is false |
| `balance_error` | Balance below ₹100 |
| `server_error` | Aggregator returned non-zero code |
| `sql_failed` | DB insert failed |

### My game records (`load-mygame-records.php`)

| status_code | Meaning |
|-------------|---------|
| `success` | Records returned |
| `no-records-found` | Empty first page |
| `no-more` | Pagination exhausted |
| `authorization_error` | Auth failed |

---

## Appendix B — Sequence Diagram

```
User          Frontend           API (PHP)          Aggregator         MySQL
  |               |                  |                   |                |
  |--click game-->|                  |                   |                |
  |               |--POST play-game->|                   |                |
  |               |                  |--validate user--->|                |
  |               |                  |--POST /game/v1--->|                |
  |               |                  |<--game_launch_url-|                |
  |               |                  |--INSERT match---->|                |
  |               |<--game_url-------|                   |                |
  |<-iframe load--|                  |                   |                |
  |===============plays game=============================================>|
  |               |                  |<--bet callback----|                |
  |               |                  |--UPDATE balance----------------->|
  |               |                  |--UPDATE match-------------------->|
```

---

*Document generated from codebase analysis. Game UIDs are tied to the external aggregator account (`AGENCY_UID`) and may change if the provider updates their catalog.*
