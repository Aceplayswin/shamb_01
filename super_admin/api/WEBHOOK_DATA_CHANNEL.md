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

## Operational notes

- Set the product's `be_url` (Super Admin → product URLs) before pulling — the
  webhook client builds the target from it.
- Apply the new master tables: `mysql … dollara_master < database/master.sql`
  (the two `CREATE TABLE IF NOT EXISTS` are additive and safe to re-run).
- Existing products created before Phase 1 won't have a credential yet — click
  **Generate** (or re-run `provision`) to issue one.
