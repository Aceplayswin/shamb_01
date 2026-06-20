# Winco — How the Games Work (End to End)

This document explains how a game runs from start to finish: how the game is launched,
how bet/win results come back via webhook, and how everything is stored in the database.

Winco is a React PWA front-end ([index.html](index.html)) backed by a PHP API. Games are
**not run on this server** — they are hosted by a third-party game aggregator
(`$GAME_SERVER_URL`). Our server only does three things:

1. **Launches** the game (gets a one-time `game_launch_url` for the player).
2. **Receives webhooks** (callbacks) from the game server every time the player bets or wins.
3. **Stores** the player's balance, every match, and the per-bet log.

---

## Key files

| Concern | File |
|---|---|
| Launch a game | [api/route-paths/request-play-games.php](api/route-paths/request-play-games.php) |
| Receive bet/win webhook | [api/game/index.php](api/game/index.php) |
| Per-request bet log | [api/game/bet_logs.txt](api/game/bet_logs.txt) |
| Player's game history (API) | [api/route-paths/load-mygame-records.php](api/route-paths/load-mygame-records.php) |
| Router / route table | [api/router/index.php](api/router/index.php), [api/router/route-paths.php](api/router/route-paths.php) |
| Secrets & config | [api/security/constants.php](api/security/constants.php) |
| Deposit initiation (gateway) | [payments/gateapi/payments/gateways1/initialisation/purntech.php](payments/gateapi/payments/gateways1/initialisation/purntech.php) |
| Deposit webhook (gateway) | [payments/gateapi/payments/gateways1/initialisation/callback.php](payments/gateapi/payments/gateways1/initialisation/callback.php) |

---

## Important constants

Defined in [api/security/constants.php](api/security/constants.php):

| Constant | Purpose |
|---|---|
| `$AGENCY_UID` | Our merchant/agency id with the game aggregator |
| `$AES_SECRET_KEY` | AES-256-ECB key used to encrypt/decrypt every payload to/from the game server |
| `$PLAYER_PREFIX` | Prefix added to a user id to build the aggregator's `member_account` |
| `$GAME_SERVER_URL` | Base URL of the third-party game server |
| `$API_TARGET_URL` | Our public API base; the webhook URL is `$API_TARGET_URL . "game/"` |

The **same `$AES_SECRET_KEY`** is used in both directions, and the payload encryption is
`base64( AES-256-ECB( json, key ) )`. Both the launch file and the webhook file define
identical `encrypt()` / `decrypt()` helpers.

---

## 1. Running a game (launch flow)

**Entry route:** `POST /route-play-games` → [api/route-paths/request-play-games.php](api/route-paths/request-play-games.php)
(routed by [api/router/route-paths.php](api/router/route-paths.php)).

Request body (JSON):

```json
{ "USER_ID": "...", "GAME_NAME": "...", "GAME_UID": "..." }
```

Step by step ([request-play-games.php](api/route-paths/request-play-games.php)):

1. **Validate params** — all of `USER_ID`, `GAME_NAME`, `GAME_UID` must be present, else `invalid_params`.
2. **Authenticate** — read the `Authorization` header (the user's `tbl_auth_secret`) and confirm
   it matches the row in `tblusersdata` for that `USER_ID`. Bad/missing token → `authorization_error` / `auth_error`.
3. **Account checks**
   - `tbl_account_status` must be `"true"`, else `account_error`.
   - Global service flag `GAME_STATUS` in `tblservices` must not be `"false"`, else `game_off`.
   - Balance must be ≥ 100, else `balance_error`.
4. **Build the encrypted launch payload** and send it to the aggregator:
   ```
   POST {$GAME_SERVER_URL}/game/v1
   {
     "agency_uid": $AGENCY_UID,
     "timestamp": <ms>,
     "payload": base64(AES-256-ECB(json, $AES_SECRET_KEY))
   }
   ```
   The inner (encrypted) payload contains: `agency_uid`, `timestamp`,
   `member_account` (= `$PLAYER_PREFIX . USER_ID`), `game_uid`, current `credit_amount`,
   `currency_code = INR`, `language = en`, `home_url`, `platform = web`, and crucially the
   **`callback_url` = `$API_TARGET_URL . "game/"`** (this is what tells the game server where
   to send the bet/win webhooks).
5. **Read the response** — if `code != 0`, return `server_error`. Otherwise pull
   `payload.game_launch_url`.
6. **Record the match session** — for the first play of this `game_uid` *today* (checked by
   `tbl_user_id` + `tbl_period_id` + date), insert a new row into `tblmatchplayed` with status
   `"wait"` and zeroed amounts. If a row for today already exists, skip the insert (results just
   accumulate onto it via the webhook).
7. **Return** to the front-end:
   ```json
   { "status_code": "success", "data": { "game_url": "<game_launch_url>" } }
   ```
   The PWA opens `game_url`; the player now plays on the aggregator's site.

`generateOrderID()` produces the per-match id (`GA0` + 15 random chars) stored as `tbl_uniq_id`.

---

## 2. Receiving webhooks (bet / win callback)

**Endpoint:** `POST $API_TARGET_URL . "game/"` → [api/game/index.php](api/game/index.php).
The aggregator calls this URL every time the player places a bet and/or wins.

Step by step ([api/game/index.php](api/game/index.php)):

1. **Connect to DB** (`localhost` / db `winco`).
2. **Decrypt the payload** — body is JSON `{ "payload": "<base64 AES>" }`; decrypt with
   `$AES_SECRET_KEY` to get the bet object.
3. **Log everything** — the raw request and the decrypted bet are appended to
   [api/game/bet_logs.txt](api/game/bet_logs.txt) (audit trail of every call).
4. **Extract fields** from the decrypted payload:
   - `game_uid` → used as `tbl_period_id`
   - `win_amount`, `bet_amount`
   - `member_account` → split on `$PLAYER_PREFIX` to recover the internal `USER_ID`.
5. **Load the user** from `tblusersdata`; account must be `tbl_account_status = "true"`.
6. **Balance-check / heartbeat call** — if `bet_amount == 0 && win_amount == 0`, this is just a
   balance sync: return the current `credit_amount` encrypted, no DB write.
7. **Compute new balances:**
   ```
   updated_balance        = tbl_balance              + win_amount - bet_amount
   tbl_requiredplay_balance = tbl_requiredplay_balance + win_amount - bet_amount
   ```
8. **Update the match record** — find the latest `tblmatchplayed` row for this user + `game_uid`
   (the "wait" row created at launch):
   - If found: accumulate `tbl_invested_on`, `tbl_match_invested`, `tbl_match_cost` by
     `bet_amount`, add `win_amount` to `tbl_match_profit`, store `tbl_last_acbalance`, and set
     `tbl_match_status` = `profit` if total profit > total cost else `loss`.
   - If not found: skip the match update but still update the wallet.
9. **Update the wallet** — write `updated_balance` and `tbl_requiredplay_balance` back to `tblusersdata`.
10. **Respond** to the game server with the encrypted new balance:
    ```json
    {
      "code": 0,
      "msg": "",
      "payload": base64(AES(json{ "credit_amount": <new balance>, "timestamp": <ms> }))
    }
    ```
    `code: 0` tells the aggregator the bet was accepted and balances are in sync.

> **Note:** This webhook is *seamless-wallet* style — the aggregator holds no money. Our DB is
> the single source of truth, and each bet debits/credits the player's `tbl_balance` in real time.

---

## 3. Where the data is stored

All data lives in the MySQL database **`winco`** (`localhost`, user/pass `winco`/`winco`).

### `tblusersdata` — the wallet & account
- `tbl_uniq_id` — internal user id (the `USER_ID` used everywhere).
- `tbl_auth_secret` — per-user auth token, sent in the `Authorization` header.
- `tbl_balance` — spendable balance (debited on bet, credited on win, on deposit).
- `tbl_requiredplay_balance` — turnover/wagering balance (kept in step with bets/wins).
- `tbl_withdrawl_balance`, `tbl_joined_under`, `tbl_account_status` (`true`/`false`).

### `tblmatchplayed` — one row per game session (per user, per game, per day)
Created at launch with status `wait`, then updated by each webhook:
- `tbl_user_id`, `tbl_uniq_id` (the `GA0...` order id), `tbl_period_id` (= `game_uid`).
- `tbl_invested_on`, `tbl_match_cost`, `tbl_match_invested` — accumulated bet totals.
- `tbl_match_profit` — accumulated winnings.
- `tbl_match_status` — `wait` → `profit` / `loss`.
- `tbl_last_acbalance` — balance snapshot after the last bet.
- `tbl_project_name` (= `GAME_NAME`), `tbl_time_stamp`.

### `bet_logs.txt` — raw audit log
[api/game/bet_logs.txt](api/game/bet_logs.txt): every webhook's raw request + decrypted bet,
appended with a timestamp. Used for debugging/reconciliation, not by the app.

### `tblservices` — runtime feature flags
e.g. `GAME_STATUS` = `true`/`false` to turn all games on/off.

### Reading the data back
The player's history is served by `GET /route-mygame-records`
([load-mygame-records.php](api/route-paths/load-mygame-records.php)), which authenticates with
`USER_ID` + `Authorization`, then returns `tblmatchplayed` rows (name, amount, bet, profit,
status, date/time) paged 40 at a time.

---

## 4. How money gets into the wallet (deposits)

Games require balance ≥ 100, so deposits feed the same `tbl_balance` the games spend.

1. **Initiate** — [purntech.php](payments/gateapi/payments/gateways1/initialisation/purntech.php)
   builds a pay-request to the PurnTech gateway (`merchant.purntech.com/.../pay-request`) with
   the amount, an 18-char `order_id`, and a `callback_url` pointing back to
   `callback.php`. The gateway returns a UPI **QR code / qr_string** that the page renders for the user.
2. **Deposit webhook** — [callback.php](payments/gateapi/payments/gateways1/initialisation/callback.php)
   is the gateway's server-to-server callback:
   - Reads JSON, logs raw + parsed to `callback_raw_log.txt` / `callback_log.txt`.
   - Extracts `data.status`, `data.order_id`, `data.amount`, optional `attach` (user id).
   - Resolves the user from `tblusersrecharge` by `order_id` if `attach` is absent.
   - **Idempotency:** if the recharge row is already `success`, it returns `success` and stops
     (duplicate callbacks ignored).
   - On `completed`/`success`: in a transaction, adds `amount` to both `tbl_balance` and
     `tbl_requiredplay_balance`, and marks the `tblusersrecharge` row `success`. Logs to
     `callback_success_log.txt`.
   - Otherwise marks the recharge `failed`.
   - Always echoes `success` (HTTP 200) so the gateway stops retrying.

> A separate **manual** recharge path (`POST /route-recharge-request` →
> [request-recharge.php](api/route-paths/request-recharge.php)) lets users submit a UTR for
> UPI/Bank deposits; these are inserted as `pending` and approved from the admin panel rather
> than via the gateway webhook.

---

## End-to-end summary

```
Player taps a game (PWA)
        │  POST /route-play-games  {USER_ID, GAME_NAME, GAME_UID}  + Authorization
        ▼
request-play-games.php  ──encrypt(payload)──▶  $GAME_SERVER_URL/game/v1
        │   (auth + account + balance checks; insert "wait" row in tblmatchplayed)
        ◀── game_launch_url ──
        │
        ▼  returns game_url → PWA opens the aggregator game
   ───────────────────────────────────────────────────────────
   Player bets / wins on the aggregator
        │  POST  $API_TARGET_URL/game/   { payload: encrypted bet }   (WEBHOOK)
        ▼
api/game/index.php
   decrypt → log to bet_logs.txt
   update tblmatchplayed (cost/profit/status)
   update tblusersdata  (tbl_balance, tbl_requiredplay_balance)
        │
        ▼  responds  { code:0, payload: encrypt(new credit_amount) }
```
