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

## Panel single sign-on (full control)

Super Admin can open every panel a product runs, with full access and no
password, over the same signed channel:

| Panel | Opens as |
|-------|----------|
| `admin` | The product's `__super_admin__` console account: no staff role (full access), no password (cannot be used from the login form). Created on first use and reset to full access on every sign-on, so a product admin cannot restrict or lock it. |
| `agent` | Any **active** agent |
| `affiliate` | Any **approved** affiliate (skips their password and 2FA) |
| `affiliate_manager` | Any **active** manager |

Flow:

1. Console → `POST /api/v1/super-admin/products/<id>/panel-sso` `{panel, account_id}`.
2. Super Admin → signed `POST {be_url}/api/v1/webhooks/super-admin/sso` (same
   `X-SA-*` contract as data pulls; the JSON body is covered by the signature).
   The product checks the account and returns a **60-second ticket** inside
   `sso_url = <panel URL>/sso#ticket=…`. `GET` on the same path lists the panel URLs.
3. The console opens `sso_url` in a new tab. The panel's `/sso` page posts the
   ticket to the public `POST {be_url}/api/v1/sso/exchange` and receives the same
   payload as that panel's own login, which it stores as usual.

Properties:

- The ticket has no `sub` claim, so it is never accepted as a bearer token. It
  rides in the URL fragment (never sent to servers) and is wiped from the address bar.
- The session lasts 8 hours and carries `imp: "super_admin"` and **no** `sid`, so
  it never signs the real account holder out and does not touch `last_login_at`.
  Suspending or closing the account still ends it.
- Panel URLs come from the product's own env: `ADMIN_URL`, `AGENT_URL`,
  `AFFILIATE_URL`, `AFFILIATE_MANAGER_URL`.
- Code: product `api/core/super_admin_sso.py`; Super Admin `tenants/views.py:product_panel_sso`.

## Operational notes

- Set the product's `be_url` (Super Admin → product URLs) before pulling — the
  webhook client builds the target from it.
- Apply the new master tables: `mysql … dollara_master < database/master.sql`
  (the two `CREATE TABLE IF NOT EXISTS` are additive and safe to re-run).
- Existing products created before Phase 1 won't have a credential yet — click
  **Generate** (or re-run `provision`) to issue one.
