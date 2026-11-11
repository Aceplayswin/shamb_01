# Super Admin → Product Webhook Data Channel

## Why this exists

Previously the Super Admin console read each product's data by **opening a MySQL
connection straight into the product's tenant database** (via the
`databases` table → `register_tenant_connection` → `use_tenant`). That couples
Super Admin to every product's database and credentials.

The new model: Super Admin never touches a product's database. It **asks the
product over HTTP**, and the product is the only process that reads its own DB.
Each request is **signed with the product's private key** so the product can
prove the request really came from Super Admin.

```
  ┌────────────────────┐        signed HTTPS GET           ┌────────────────────┐
  │   Super Admin      │  ───────────────────────────────▶ │   Product (dollara) │
  │  (control plane)   │   X-SA-Signature: <RSA-PSS>       │   webhook endpoint  │
  │                    │ ◀───────────────────────────────  │   reads its OWN DB  │
  │  holds PRIVATE key │           JSON rows               │  holds PUBLIC key   │
  └────────────────────┘                                   └────────────────────┘
```

## Phase 1 — DONE (this repo, super_admin only)

- Every product gets an RSA-2048 key pair at creation (`product_credentials`).
  - Super Admin keeps `private_pem` and **signs** every data pull.
  - The product gets `public_pem` and **verifies** every pull.
- Signed-webhook client: [`services/webhook_client.py`](services/webhook_client.py).
- Signing primitives (shared contract): [`services/crypto_keys.py`](services/crypto_keys.py).
- Credential lifecycle: [`services/product_credentials.py`](services/product_credentials.py).
- Every pull is audited in `webhook_deliveries`.

### New API (Super Admin console)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/v1/super-admin/products/<slug>/credential` | Active credential (public material) |
| POST | `/api/v1/super-admin/products/<slug>/credential/generate` | Issue first key pair (reveals private key **once**) |
| POST | `/api/v1/super-admin/products/<slug>/credential/rotate` | New key pair, retire old (reveals private key **once**) |
| POST | `/api/v1/super-admin/products/<slug>/credential/mark-delivered` | Mark product has installed the public key |
| GET  | `/api/v1/super-admin/products/<slug>/data-webhook/summary` | Counts + aggregates, **pulled over webhook** |
| GET  | `/api/v1/super-admin/products/<slug>/data-webhook/<dataset>` | Paginated rows, **pulled over webhook** |
| GET  | `/api/v1/super-admin/products/<slug>/data-webhook/deliveries` | Webhook call audit trail |

The old `…/data/summary` and `…/data/<dataset>` (direct DB) endpoints are kept
during migration and will be removed once every product implements the webhook.

## The signing contract (both sides MUST agree byte-for-byte)

Super Admin sends:

```
GET {be_url}/api/v1/webhooks/super-admin/data/{resource}?{query}
  X-SA-Product:   <product slug>
  X-SA-Key-Id:    <credential.key_id>          e.g. sak_3f9c…
  X-SA-Timestamp: <unix seconds>
  X-SA-Nonce:     <random hex>
  X-SA-Signature: base64( RSA-PSS / SHA-256 ( signing-string ) )
```

`signing-string` = these 6 lines joined by `\n` (no trailing newline):

```
<METHOD uppercased>
<request path INCLUDING query string>     e.g. /api/v1/webhooks/super-admin/data/users?page=1&page_size=50
<key_id>
<timestamp>
<nonce>
<hex SHA-256 of the raw request body>     (empty body → sha256("") )
```

- RSA-PSS, MGF1(SHA-256), salt length = digest length (`PSS.MAX_LENGTH`).
- `resource` maps `.`→`/`: `data.summary` → `/data/summary`, `data.users` →
  `/data/users`.
- Base path prefix is `WEBHOOK_BASE_PATH = /api/v1/webhooks/super-admin`.

## Phase 2 — DONE (on dollara, `dollara/api`)

The product side now:

1. **Reads the public key + key_id** Super Admin issued. dollara shares Super
   Admin's master/control-plane DB (`dollara_master`), so it reads `public_pem`
   straight from the `product_credentials` table via a read-only mirror model
   (`tenants.models.ProductCredential`) keyed on `X-SA-Key-Id`. Because `key_id`
   is unique, a **rotation is picked up automatically with no redeploy**. Deploys
   that don't share the master DB can pin a key via
   `SUPER_ADMIN_WEBHOOK_KEY_ID` / `SUPER_ADMIN_WEBHOOK_PUBLIC_KEY` env vars.
   Resolver: [`dollara/api/services/super_admin_keys.py`](../../dollara/api/services/super_admin_keys.py).
2. **Mounts the verifying endpoint** at
   `/api/v1/webhooks/super-admin/data/<resource>`
   ([`dollara/api/core/webhook_views.py`](../../dollara/api/core/webhook_views.py),
   routed in [`dollara/api/config/urls.py`](../../dollara/api/config/urls.py)) that:
   - Rejects if `X-SA-Timestamp` is older than 300s (replay protection).
   - Rebuilds the signing-string from the **received** method/path/headers/body
     and verifies `X-SA-Signature` against the stored public key for `X-SA-Key-Id`
     ([`dollara/api/services/webhook_verify.py`](../../dollara/api/services/webhook_verify.py),
     a faithful copy of the reference verifier — same `build_signing_string`).
   - Validates the key's product matches `X-SA-Product`, activates that tenant's
     DB, reads the product's **own** database, and returns the same JSON shapes
     the console expects (mirrors `_DATASETS` / `product_data_summary` /
     `product_dataset` in [`tenants/views.py`](tenants/views.py) column-for-column).
3. **Marking delivered:** because dollara reads the public key live from the
   shared control plane, there is nothing to "install" — the operator just clicks
   `…/credential/mark-delivered` (or POSTs it) to record the handshake.

The drop-in reference the product side was built from lives at
[`docs/product_verifier_reference.py`](docs/product_verifier_reference.py) — it
reuses the exact same `build_signing_string` contract so the two sides cannot
drift.

## Data console (read + write, no panel sign-on)

Super Admin does **not** sign into a product's panels (admin, agent, affiliate,
affiliate manager). The earlier panel single sign-on was removed end to end:
the `panel-sso` endpoint, the product's `sso` webhook and `/sso/exchange`, and
each panel's `/sso` page. Panel sessions it had already issued (JWTs carrying
`imp`) are refused by the product's auth middleware.

Instead the console works on the data itself, over the same signed channel:

| Console → Super Admin | Super Admin → product (signed) | Does |
|---|---|---|
| `GET …/data-webhook/summary` | `GET …/data/summary` | Counts for every table, money totals, `writable: true` |
| `GET …/data-webhook/<dataset>?page&page_size&q&sort&dir&filter_<field>` | `GET …/data/<dataset>?…` | One page of any table, with its field schema |
| `POST …/data-webhook/<dataset>` `{values}` | `POST …/data/<dataset>` | Create a record |
| `GET …/data-webhook/<dataset>/<id>` | `GET …/data/<dataset>/<id>` | Full record, related rows, available actions |
| `PATCH …/data-webhook/<dataset>/<id>` `{changes}` | `PATCH …/data/<dataset>/<id>` | Change any fields |
| `DELETE …/data-webhook/<dataset>/<id>` | `DELETE …/data/<dataset>/<id>` | Delete it |
| `POST …/data-webhook/<dataset>/<id>/actions/<action>` `{values}` | `POST …/data/<dataset>/<id>/actions/<action>` | Run an action |

(`…` is `/api/v1/super-admin/products/<id>` on the console side and
`{be_url}/api/v1/webhooks/super-admin` on the product side.)

Product side: `api/core/super_admin_data.py` (registry, schema, writes,
actions) behind `api/core/webhook_views.py`. Super Admin side:
`tenants/views.py` (`product_webhook_dataset` / `_record` / `_action`), which
only validate the request shape and relay it. The console renders whatever the
product sends, so a new table or action needs no Super Admin change.

- **Datasets** are every ORM-backed table of the product, keyed by table name and
  discovered from Django's app registry. Replay nonces and login challenges are
  left out; audit trails (`agent_audit_logs`, `affiliate_audit_logs`,
  `affiliate_api_logs`, `game_callback_logs`) are read-only.
- **Secrets never leave the product.** `password_hash` is write-only: a new
  password is hashed by the product and rotates the account's
  `active_session_id`, signing it out everywhere. Other secret columns
  (`two_factor_secret`, `aes_secret_key`, `webhook_secret`, …) can be replaced or
  cleared but are only ever reported as set / not set. `active_session_id` is
  never exposed; the *Sign out everywhere* action rotates it.
- **Validation** is each field's own `clean()`: type, choices, length, decimal
  places, and that a referenced row exists. Refusals come back as HTTP 400 with
  `{"error", "fields": {name: reason}}`, which Super Admin relays unchanged.
- **Actions** go through the product's own services so the books stay right:
  adjust main balance (ledger adjustment row), confirm/reject deposit,
  approve/reject withdrawal, agent application approval / rejection / credit /
  status, affiliate application approval / rejection / status, affiliate payout
  approve / paid / reject, and sign-out. Audit entries name the product's
  `__super_admin__` account, which has no password and stays inactive, so
  nobody can sign in as it.
- **Replay protection for writes.** Every POST / PATCH / DELETE records its
  `(key_id, nonce)` in `super_admin_webhook_nonces`; the same signed write sent
  twice is refused with 409. Existing product databases get the table created on
  the first write.
- **Audit.** Every request is a row in `webhook_deliveries` here, and the product
  logs each change with before/after values to `logs/super_admin_data.log`.

## Operational notes

- Set the product's `be_url` (Super Admin → product URLs) before pulling — the
  webhook client builds the target from it.
- Apply the new master tables: `mysql … dollara_master < database/master.sql`
  (the two `CREATE TABLE IF NOT EXISTS` are additive and safe to re-run).
- Existing products created before Phase 1 won't have a credential yet — click
  **Generate** (or re-run `provision`) to issue one.
