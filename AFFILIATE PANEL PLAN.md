# Dollara Affiliate Panel — Implementation Plan

Status: proposal / not started
Scope: `dollara` product only (this plan does not touch `super_admin` or other tenants)

## 0. Why this document exists

Dollara already has two portals — the player-facing `dollara/web` and the staff-facing
`dollara/admin` — both talking to one Django API (`dollara/api`) that belongs to a single
tenant/product. This plan adds a **third portal**: an affiliate-facing panel that lets
external partners drive signups to Dollara, track what those signups do, and get paid a
commission for it.

The schema already has a placeholder for this — `affiliates` and `agents` tables exist in
[`database/init.sql`](dollara/api/database/init.sql) (`code`, `commission_tier`,
`parent_affiliate_id`, `total_commission`, …) — but there is no login, no dashboard, no
tracking, no commission engine, and no Django model behind them. This is a from-scratch
build that happens to have a starting schema.

## 1. Architecture decision

**Build the affiliate panel as its own portal**, mirroring how `super_admin` is separate
from `dollara/admin`, rather than bolting it onto the existing web or admin app:

- `dollara/affiliate` — new Next.js 14 app (own `package.json`, own port, e.g. `3003`),
  same stack as `dollara/admin` (Tailwind, `lucide-react`, `sweetalert2`). This is the
  affiliate's own portal — dashboard, links, referrals, earnings, payouts, API keys.
- `dollara/admin` — gains a new **Affiliates** section (staff-facing) alongside the
  existing `staff`, `users`, `bonuses`, `reports` sections — for approving affiliates,
  setting commission rates, reviewing payouts, and killing abusive accounts.
- `dollara/api` — gains a new `core/affiliate_*` module (models, services, views) plus a
  signed-key webhook contract for programmatic access, symmetrical to the existing
  Super Admin ↔ Dollara contract in `services/webhook_verify.py`.

Reasons to keep it a separate app instead of a route inside `web` or `admin`:

- Affiliates are a third trust boundary — not staff, not players. Giving them a slice of
  the admin app risks leaking staff-only routes/components; giving them a slice of the
  player web app conflates player JWTs with affiliate JWTs.
- The existing three-portal pattern (`super_admin` / `admin` / `web`) already proves this
  separation works operationally (separate deploys, separate ports, separate auth).
- It matches the phase-4 requirement directly: an external partner authenticating via a
  signed key pair is architecturally the same shape as Super Admin's relationship to
  Dollara today, just inverted (Dollara is now the one handing out keys, not receiving
  them).

**Scope note:** this program is scoped to the `dollara` product/tenant only, consistent
with the rest of `dollara/api` (`TenantResolverMiddleware` — "this instance serves a
single product"). If other tenants want an affiliate program later, this module gets
copied per-tenant like everything else in `dollara/api`; it is *not* built centrally in
`super_admin`.

## 2. Domain model (read this before the phases)

**Actors**
- **Affiliate** — external partner with a login to `dollara/affiliate`. Can have
  sub-affiliates under them (`parent_affiliate_id` already in schema → multi-tier).
- **Referred user** — a normal row in `users` / `user_settings`, linked back to the
  affiliate that brought them in (`user_settings.affiliate_id`, already in schema).
- **Staff/Admin** — approves affiliates, sets rates, approves payouts, from
  `dollara/admin`.

**Commission models** (schema already declares the shape via `agents.commission_type`):
- **Revenue share** — % of a referred user's net gaming revenue (bets − wins), recurring.
- **CPA** — flat bounty per qualifying action (e.g. first deposit ≥ threshold), one-time.
- **Hybrid** — CPA for the first N days, revenue share after.
- **Tiered override** — a parent affiliate earns a smaller % of their sub-affiliates'
  commission, on top of the sub-affiliate's own payout.

**Attribution**
- Click on `dollara.example/?ref=<affiliate_code>&sub=<campaign_id>` → cookie set →
  registration reads the cookie and writes `user_settings.affiliate_id` +
  `user_settings.referral_code` at signup time. Last-click attribution, configurable
  cookie window (default 30 days), covered in Phase 2.

## 3. Phase 1 — UI/UX (affiliate portal + admin management section)

Goal: every screen and every control wireframed and built with mock/static data before
any real logic exists. Reuse `dollara/admin`'s existing component conventions (table +
pagination + filter bar pattern already used in `staff`, `users`, `reports`) so the new
app doesn't invent a second design language.

### 3.1 `dollara/affiliate` (partner-facing)

| Screen | Controls |
|---|---|
| **Landing / Apply** | Program pitch page, "Apply now" form (name, email, company, traffic source, expected volume, payment preference), application status banner (pending/approved/rejected) |
| **Login** | Email/password, "forgot password", 2FA code entry (reuse `user_settings.two_factor_enabled` pattern from players) |
| **Onboarding (post-approval)** | Accept T&Cs, set payout method, generate first tracking link, KYC document upload (reuse `kyc_documents` pattern) |
| **Dashboard** | Date-range picker; stat cards (clicks, signups, first deposits, active players, commission this period, pending payout); trend charts (clicks→signups→FTDs funnel, commission over time); top-performing links table; recent referral activity feed |
| **Links & Creatives** | "Create link" (campaign name / sub-id / target landing page), link list with per-link clicks/conversions, copy-link button, QR code generator, banner/creative asset gallery (download by size), deep-link builder for app installs |
| **Referrals (my users)** | Table of referred players: signup date, KYC status, first deposit date/amount, lifetime deposits, lifetime commission generated, status (active/dormant/blocked) — click-through to a detail panel per player (aggregated stats only, never raw PII beyond what's needed) |
| **Sub-affiliates / Network** | Tree/list view of recruited sub-affiliates, each row's own performance summary, "invite sub-affiliate" (generates a signup link with `parent_affiliate_id` pre-set), override-commission summary |
| **Earnings / Commission ledger** | Filterable ledger (by type: revenue share / CPA / override), status per line (pending → approved → paid → clawed back), downloadable statements (CSV/PDF) per period |
| **Payouts** | Current balance, "Request payout" (disabled below minimum threshold), payout history table with status, payout method management (bank/UPI/crypto — mirrors `bank_accounts`) |
| **Reports** | Custom date range + breakdown (by link / by sub-affiliate / by country), CSV export (mirrors `admin/reports/<kind>/export` pattern already in `dollara/admin`) |
| **API & Integration** | Generate keypair (shows public key + one-time private-key download), key status (active/rotating/revoked), rotate key, revoke key, webhook URL config (affiliate's own postback endpoint), API docs link, request/response log (last N signed calls, for debugging) |
| **Notifications** | In-app feed: new referral, first deposit, commission approved, payout sent/rejected, key rotation reminders |
| **Profile / Settings** | Company info, contact info, password change, 2FA toggle, notification preferences, timezone/currency |
| **Support** | Ticket list + new ticket (reuse `support_tickets` table, tag with `source='affiliate'` or a new source value) |

### 3.2 `dollara/admin` — new "Affiliates" section (staff-facing)

| Screen | Controls |
|---|---|
| **Applications queue** | List of pending affiliate applications, approve/reject (with reason), request-more-info |
| **Affiliate list** | Search/filter (status, tier, commission type), row → detail view, suspend/reactivate, delete |
| **Affiliate detail** | Profile, KYC docs review, commission type/rate override, parent affiliate reassignment, referred-users list, commission ledger, payout history, API key list (view/revoke — never view the private key), activity/login log |
| **Payout approvals** | Pending payout requests queue, approve/reject/mark-as-paid, bulk actions |
| **Global settings** | Default commission rate/type per new affiliate, cookie/attribution window, minimum payout threshold, payout cycle (weekly/monthly/on-demand), fraud thresholds (self-referral, velocity limits) |
| **Fraud/audit** | Flagged referrals (same IP/device as affiliate, disposable email patterns, velocity spikes), audit log of admin actions on affiliate accounts |

Deliverable for this phase: both apps scaffolded and navigable end-to-end on static/mock
data, reviewed and signed off before Phase 2 logic starts.

## 4. Phase 2 — Business logic

Goal: everything in Phase 1 backed by real behavior, still against the *existing* schema
shape (real tables land in Phase 3, but the service layer can be designed in parallel).

- **Attribution service** — read `ref`/`sub` query params on landing, set attribution
  cookie, resolve to `affiliate_id` at registration time (extends the existing
  `register_user` flow in `core/services.py`), enforce cookie/attribution window from
  global settings, last-click wins.
- **Commission engine** — scheduled job (daily) that:
  - walks completed bets/settlements for referred users since last run,
  - computes revenue-share commission per referring affiliate,
  - checks CPA trigger conditions (first deposit ≥ threshold) and awards one-time bounty,
  - applies tiered overrides up the `parent_affiliate_id` chain,
  - writes ledger entries in `pending` state.
- **Approval workflow** — pending → approved (auto after N days or manual staff review)
  → included in next payout cycle; clawback path for chargebacks/fraud reversals.
- **Payout workflow** — affiliate requests payout (or auto-payout on cycle) → staff
  approval → marked paid (manual bank transfer initially, matching how withdrawals are
  handled for players today) → ledger entries flip to `paid`.
- **Fraud checks** — self-referral (affiliate's own device/IP/email domain signing up
  under their own code), velocity limits (signups/hour from one IP), duplicate
  bank/payout details across affiliates.
- **Notifications** — hook into existing notification patterns (`notifications` table /
  admin activity feed) for: new referral, first deposit, commission approved, payout
  status change, key rotated/revoked.
- **Reporting/export** — reuse the existing `admin/reports/<kind>/export` service pattern
  from `core/admin_services.py` for the affiliate-side CSV/PDF exports.

## 5. Phase 3 — Database setup

Extend the existing `affiliates` table and add the tables it's missing. **Editing
`init.sql` alone does nothing to the live tenant database** — every change below ships as
a numbered file in
`dollara/api/database/migrations/` (next one is `002_affiliate_program.sql`, following
the pattern in `001_registration_path_direct.sql`) and is then run by hand against the
tenant DB:

```
mysql -u root <tenant_db> < database/migrations/002_affiliate_program.sql
```

`init.sql` also gets the same tables added, so fresh tenant installs don't need the
migration replayed.

**Extend `affiliates`:**
```sql
ALTER TABLE affiliates
  ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
  ADD COLUMN password_hash VARCHAR(255) AFTER email_verified,
  ADD COLUMN status ENUM('pending','approved','rejected','suspended') DEFAULT 'pending' AFTER is_active,
  ADD COLUMN commission_type ENUM('revenue_share','cpa','hybrid') DEFAULT 'revenue_share' AFTER commission_tier,
  ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 10 AFTER commission_type,
  ADD COLUMN payout_threshold DECIMAL(18,2) DEFAULT 0 AFTER total_commission,
  ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN kyc_status ENUM('none','pending','verified','rejected') DEFAULT 'none',
  ADD FOREIGN KEY (parent_affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL;
```

**New tables:**

- `affiliate_links` — `id, affiliate_id, code, campaign_name, sub_id, target_path, clicks_count, created_at`
- `affiliate_clicks` — `id, link_id, affiliate_id, ip_address, user_agent, referrer_url, country_code, converted BOOLEAN, created_at` (raw click log, high volume — index on `link_id`, `created_at`)
- `affiliate_referrals` — `id, affiliate_id, user_id, link_id, attributed_at, first_deposit_at, first_deposit_amount` (one row per referred user; `user_id` FK → `users.id`, unique on `user_id`)
- `affiliate_commission_ledger` — `id, affiliate_id, referral_id, type ENUM('revenue_share','cpa','override','clawback'), amount, status ENUM('pending','approved','paid','clawed_back'), period_start, period_end, created_at`
- `affiliate_payouts` — `id, affiliate_id, amount, method, status ENUM('requested','approved','paid','rejected'), requested_at, processed_at, notes`
- `affiliate_payout_methods` — `id, affiliate_id, method_type ENUM('bank','upi','crypto'), details JSON, is_primary`
- `affiliate_api_keys` — `id, affiliate_id, key_id VARCHAR(40) UNIQUE, public_pem TEXT, fingerprint VARCHAR(64), status ENUM('active','rotating','revoked'), created_at, revoked_at` (never stores the private key)
- `affiliate_creatives` — `id, title, asset_type ENUM('banner','logo','video'), file_url, dimensions, created_at`
- `affiliate_audit_logs` — `id, affiliate_id, actor_type ENUM('affiliate','staff'), actor_id, action, metadata JSON, created_at`

Every new table gets `FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)` and an index
on `affiliate_id`, matching the existing convention across `init.sql`.

Add matching Django models in `core/models.py` (there are currently none for
`affiliates`/`agents` at all — `UserSetting.affiliate_id` is just a bare `BigIntegerField`
today with no relation).

## 6. Phase 4 — Connecting the affiliate panel to Dollara (public/private key, base64)

This reuses the exact cryptographic contract already proven for Super Admin ↔ Dollara
(`services/webhook_verify.py`, RSA-PSS over SHA-256, base64-encoded signature) rather
than inventing a new scheme — but on **its own header namespace and its own key store**,
so an affiliate key can never be mistaken for a Super Admin key or vice versa.

### 6.1 What "public key / private key / base64" means concretely here

1. On affiliate approval (or via "Generate API key" in the portal), the API generates an
   RSA keypair server-side.
2. The **public key** is stored in `affiliate_api_keys.public_pem`.
3. The **private key** is shown to the affiliate **exactly once** for download/copy — it
   is never persisted in plaintext server-side after that response.
4. Every request the affiliate's system makes to Dollara's affiliate API is signed: the
   JSON body is base64-encoded, hashed (SHA-256), and signed with the affiliate's private
   key (RSA-PSS). Dollara verifies the signature against the stored public key before
   trusting the request — same shape as `verify_incoming()` in `webhook_verify.py`, just
   keyed by `affiliate_id` instead of product.
5. Symmetrically, when Dollara pushes conversion/commission events *to* the affiliate's
   own tracking system (postback), Dollara signs the outgoing payload with **Dollara's**
   key so the affiliate can verify it really came from Dollara.

### 6.2 Wire contract

New headers (distinct from `X-SA-*` to keep trust domains separate):

```
X-Aff-Key-Id
X-Aff-Timestamp
X-Aff-Nonce
X-Aff-Signature
```

Canonical signing string — identical construction to `build_signing_string()`:

```
METHOD
path (with query string)
key_id
timestamp
nonce
sha256(body).hex()
```

Reject requests outside a timestamp skew window (reuse `SIGNATURE_MAX_SKEW_SECONDS`
convention). **Unlike the current SA contract, implement the nonce-replay store from day
one** (it's flagged as a known gap in `webhook_verify.py`'s docstring for the SA side) —
affiliate keys are a lower-trust, externally-distributed surface, so replay protection
shouldn't be deferred here.

### 6.3 Refactor for reuse

Pull the canonical-string builder and generic verify/sign logic out of
`webhook_verify.py` into a shared `services/signing.py` parameterized by header prefix and
a `resolve_key(key_id)` callback — then both the existing SA contract and the new
affiliate contract call the same primitives instead of copy-pasting crypto code. This is
the one piece of Phase 4 that touches existing files.

### 6.4 Endpoints

- `POST /api/v1/affiliate/webhook/postback` — affiliate system → Dollara (e.g. register an
  external click, or confirm an offline conversion), signed with the affiliate's key.
- `GET /api/v1/affiliate/data/<resource>` — affiliate pulls stats programmatically
  (clicks, referrals, commission), signed pull mirroring the existing
  `super_admin_data_webhook` resource-pull pattern in `config/urls.py`.
- `POST /api/v1/affiliate/keys/rotate` — issues a new keypair, marks the old one
  `rotating` for a grace window, then `revoked` (dual-key overlap so in-flight signed
  requests don't break mid-rotation).
- `POST /api/v1/affiliate/keys/revoke` — immediate revocation (checked on every verify,
  not cached beyond a few seconds).

### 6.5 Security checklist before shipping

- [ ] Private key is never logged, never stored server-side after the one-time display
- [ ] Signature verification checked on **every** affiliate API/webhook request, no
      unauthenticated fallback path
- [ ] Nonce store prevents replay within the timestamp window
- [ ] Key revocation takes effect within one cache TTL window, not "next deploy"
- [ ] Rotation supports overlap (old key still verifies during grace period) so partner
      integrations don't break on rotation
- [ ] Rate limiting per `key_id`, independent of per-IP limits
- [ ] `X-Aff-*` namespace never accepted on `X-SA-*` routes and vice versa (separate
      middleware/view, not a shared header parser with a mode flag)

## 7. Suggested build order

1. **Phase 3 first in practice**, even though it's listed third: land the schema
   migration and Django models before UI work starts, so Phase 1 can wire real (if empty)
   endpoints instead of double-building against mocks then real data.
2. Phase 1 UI scaffolding (both apps) against the new-but-empty tables.
3. Phase 2 logic — attribution, commission engine, payouts — fills in the screens.
4. Phase 4 signed-key integration — additive, doesn't block 1–3, can run in parallel
   once Phase 3's `affiliate_api_keys` table exists.

