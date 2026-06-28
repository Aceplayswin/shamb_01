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

## Phase 2 — TODO on dollara (NOT done yet — do not start until confirmed)

The product side must:

1. **Store the public key + key_id** Super Admin issued (env var, config, or a
   small `super_admin_keys` table). Accept rotation.
2. **Mount the verifying endpoint** at
   `/api/v1/webhooks/super-admin/data/<resource>` that:
   - Rejects if `X-SA-Timestamp` is older than 300s (replay protection).
   - Rebuilds the signing-string from the **received** method/path/headers/body
     and verifies `X-SA-Signature` against the stored public key for `X-SA-Key-Id`.
   - On success, reads the product's **own** database and returns the same JSON
     shapes the console expects (see `_DATASETS` / `product_data_summary` /
     `product_dataset` in [`tenants/views.py`](tenants/views.py) for the response
     shape to reproduce).
3. **POST back** (or have an operator click) `…/credential/mark-delivered` once
   the key is installed.

A drop-in verifier for the product lives at
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
