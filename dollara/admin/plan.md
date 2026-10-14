# Backoffice Parity — reference screens on the current admin theme

Maps the reference backoffice (`screenshots/`, 87 pages captured from
admin.velwin365.com) onto this console: every data input field, column and
table name is taken from the reference, but rendered with the **existing**
admin theme (dark slate sidebar shell, `AdminShell` primitives). No colours,
radii, spacing or navigation patterns were changed.

Where the reference splits one flow across several pages — search on one,
create on another — they are collapsed into a single screen here, with the
create form in a modal over the list.

**Legend:** `[x]` done · `[ ]` not built · `[-]` removed

> **Backoffice reports removed.** The Reports page's Backoffice tab, the 36
> `/bo-reports/*` screens, the `/api/v1/admin/bo/reports/<slug>` endpoints and
> their aggregations are gone. Everything else under `/admin/bo/…` (cashier,
> mailing, risk, staff groups, bonuses) is unaffected.

---

## Database — backoffice parity

Shipped as `009_backoffice_parity.sql`, since merged into `database/init.sql`
along with every later migration. Idempotent (verified over three consecutive
runs; table count stable).

- [x] `users`: `first_name`, `last_name`, `state`, `signup_ip`, `created_by`,
      `staff_group_id` + indexes. Existing rows back-filled from `full_name`
      (single names leave `last_name` NULL; multi-word surnames kept intact).
      Superseded by `011_drop_email_dob_kyc.sql`, which folds the name split
      back into `full_name` and drops `first_name` / `last_name` / `email`.
- [x] `user_settings`: `risk_level`, `vip_level`
- [x] `blocked_ips`: `status`, `comments`, `updated_at`
- [x] `transactions`: `provider_id`, `provider_payment_id`, `error_message`
- [x] `games`: `sort_order`
- [x] `bonuses`: 14 Create-Bonus-wizard columns — `priority`, `coupon_length`,
      `is_published`, `is_public`, `affiliate_id`, `parent_bonus_id`,
      `comment`, `redemption_type`, `redemption_amount`,
      `max_redeemable_value`, `payment_methods`, and the three Abuse
      thresholds
- [x] 11 new tables: `staff_groups`,
      `staff_group_permissions`, `mail_templates`, `mail_configurations`,
      `payment_methods`, `payment_providers`, `payment_provider_methods`,
      `payment_bin_rules`, `payment_frontend_rules`, `cashier_queue_items`,
      `bonus_excluded_affiliates`, `bonus_translations`

## Backend

- [x] `core/backoffice_models.py` — 15 models, all verified field-by-field
      against the live schema
- [x] `core/backoffice_services.py` — users, plays, activity, risk, events,
      tasks, tickets
- [x] `core/backoffice_reports.py` — cashier, mailing and staff-group
      services
- [-] `core/backoffice_reports.py` — 33 report aggregations
- [x] `core/backoffice_views.py` — endpoints under `/api/v1/admin/bo/…`,
      admin-only, with audit logging on every write
- [-] Reports are slug-dispatched (`/reports/<slug>`) with CSV export
      (`/reports/<slug>/export`)
- [x] `admin_create_user` stores first/last name, state, signup IP and the
      creating admin; `list_users` reads the real columns rather than the old
      JSON-blob fallback

## Frontend — 52 new routes

- [x] `components/admin/Backoffice.jsx` — `SearchPage`, `FilterPanel`,
      `ResultTable` (server-paged), shared column helpers
- [-] `components/admin/Backoffice.jsx` — `BreakdownTable`, `EvolutionChart`,
      `TotalBanner`, `ExportButton`
- [x] `components/admin/CrudPage.jsx`, `QueuePage.jsx`, `ConfigPage.jsx`
- [x] Players: Search Plays, Players Online
- [x] Risk: Blocked IP, Blocked Credit Cards
- [x] Cashier: Payment Methods, Providers, BIN Rules, Front End Rules,
      Decline Queue, Upgrade Queue
- [x] Mailing: Templates, Casino Configuration, Email/SMS Configuration
- [x] Configurations: User Groups (module × action permission matrix)
- [x] Bonus: Create Bonus (7-step wizard — General, Redemption, Coupon Sets,
      Abuse, Exclude Affiliates, Allowed Countries, Wagering Conditions),
      Bonus List (5 filters), Exchange Bonus
- [x] Games: Sort by Web (reorder with move up/down, saved in one write)
- [-] Reports: Real Revenue, Free Money Analysis, Jackpot Contribution,
      Players Campaign, Sports Report
- [x] Reports export filter accepts **any** player identifier (id, username,
      phone, email, first/last/full name) instead of an exact username only
- [-] 33 report screens + a grouped report index
- [x] Users page: Create form now collects first/last name and state, matching
      the reference "New Player" form

---

## Verification

Run against MySQL loaded from `database/init.sql` (which now carries this
migration's changes).

- Migration idempotent across 3 runs; 51 → 63 tables, then stable
- 18 models: every field present in the database
- 53/53 service functions execute
- 33/33 write and validation assertions pass
- 89/89 HTTP assertions: 401 unauthenticated, 33 reports 200, CSV headers
  correct, CRUD lifecycles, 400 on bad input, 404 unknown report, 405 wrong
  method
- 26/26 bonus assertions: all 14 wizard fields round-trip through create,
  update and the serializer; excluded-affiliate sets dedupe and replace
  wholesale; translations upsert per language
- 16/16 bonus HTTP assertions
- 45/45 sports assertions: catalogue and series toggles, market pinning and
  the three-way fancy status, per-match limit upsert (min-above-max refused),
  config whitelist, and game reordering (duplicates and unknown ids refused)
- 38/38 sports HTTP assertions
- 22/22 player-resolver assertions + 8/8 over HTTP: every identifier type
  resolves, an exact match never drags in look-alikes, and a term matching
  nobody exports zero rows rather than the whole table
- Bonus eligibility verified branch by branch — excluded affiliate, recent
  play, per-user limit, exhausted budget — and it reports *every* failing
  reason rather than short-circuiting on the first
- Report arithmetic checked independently: 10 rounds × (bet 100, win 60) →
  staked 1000, returned 600, gross profit 400, margin 40%; breakdown
  percentages sum to 100; empty windows return 0% rather than dividing by zero
- Create path round-trips both ways (first/last → full_name and back), with
  multi-word surnames preserved
- Audit rows written for every mutation, with actor and IP
- `next build` passes: 100 routes
- **All 87 reference pages have a console screen** (checked against
  `screenshots/manifest.json`, zero unbuilt)

### Screens that render empty until data arrives

Every reference page is built, but four depend on data this platform does not
produce yet. Each says so on screen rather than showing bare zeros:

- **Sports Report** — reads `sport_bets`, which is empty until the sportsbook
  takes stakes.
- **Jackpot Contribution** — needs `jackpot_contribution_percent` in platform
  settings; with no rate set every contribution is zero.
### Known limitation

The Abuse tab's "redeemed by a similar player (%)" threshold is **stored but
not enforced** — similarity scoring between accounts does not exist on this
platform, so `bonus_eligibility` skips that one check while applying the other
two. The field is persisted so the rule survives until scoring is built.
