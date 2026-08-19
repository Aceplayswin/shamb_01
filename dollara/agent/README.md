# Dollara Agent Panel — Developer Documentation

**Stack:** Next.js 14 (App Router) · JavaScript · Tailwind CSS · Lucide React · SweetAlert2
**Port:** `3004`

---

## What this is

The **downline-facing console** for the Dollara platform: an agent signs in, sees the
book its subtree is carrying, opens accounts below itself, moves credit up and down that
tree, and settles P&L.

It is a separate Next.js app — its own `package.json`, port and auth — for the same
reason `dollara/affiliate` is: agents are a distinct trust boundary. There are now four
portals:

| Portal | Path | Port | Who uses it |
|---|---|---|---|
| Player web | `dollara/web` | 3000 | Players |
| Staff admin | `dollara/admin` | 3002 | Internal staff |
| Affiliate | `dollara/affiliate` | 3003 | External marketing partners |
| **Agent** | `dollara/agent` | **3004** | Downline operators |

---

## Running locally

```bash
cd dollara/agent
npm install
npm run dev          # http://localhost:3004
```

`.env` needs one variable:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

There is no self sign-up. An agent account is opened by its upline, so the first one has
to be inserted by hand (`agents` needs `username`, a bcrypt `password_hash`, `level`,
and `tree_path` set to `/<its own id>/`).

---

## Screens

| Route | What it does |
|---|---|
| `/login` | Username + password. No 2FA — agents are internal to the tree, unlike affiliates. |
| `/dashboard` | Period picker, per-player casino/sports breakdown, headline tiles, seven ranked tables. |
| `/sport-analysis` | The **live** book by sport → event → market. Not date-filtered: an unsettled bet from last week is still risk today. |
| `/clients` | The agent accounts **directly** below this one. Create, credit, lock betting. |
| `/players` | Every player in the subtree. Search, create, credit, block. |
| `/reports/pl-market` | P&L grouped by event + market, split MEMBER / AGENT / UPLINE. |
| `/reports/pl-agent` | The same numbers grouped by attributed agent, each row split on **that** agent's partnership. |
| `/reports/bet-list` | Every individual stake. |
| `/reports/transfer-statement` | Credit in and out of this agent's own balance. |
| `/reports/settlement` | Settlements recorded against downline accounts. |
| `/reports/transactions` | Deposits and withdrawals across the subtree. |
| `/reports/event-pl` | P&L rolled up to the fixture. |
| `/reports/real-revenue` | Cash in, cash out, and what the book kept — per downline agent. |
| `/profile` | Account, position, change password. |

Every report screen shares one frame (`_components/ReportShell.js`) and one of two table
components: `PlTable` for the three grouped MEMBER/AGENT/UPLINE reports, `SimpleTable`
for the five flat ones.

---

## Folder structure

```
dollara/agent/
├── tailwind.config.js         # the dark console palette (shell/panel/ink/up/down)
└── src/
    ├── app/
    │   ├── globals.css        # .card / .field / .btn-* / .tbl component layer
    │   ├── layout.js          # fonts, html/body
    │   ├── page.js            # redirects to /dashboard or /login
    │   ├── login/page.js
    │   └── (panel)/
    │       ├── layout.js      # auth guard + top nav + collapse strip + footer
    │       ├── _components/   # TopNav, Card, StatTile, PlTable, SimpleTable,
    │       │                  # ReportShell, CreditModal, CreateAccountModal, …
    │       ├── dashboard/  sport-analysis/  clients/  players/  profile/
    │       └── reports/<eight screens>
    ├── components/ui/         # DataState, Pagination
    ├── context/AgentContext.js
    ├── hooks/useAgentData.js
    ├── lib/                   # format.js, toast.js
    └── services/              # agentApi.js (session + fetch), tenant.js
```

---

## Backend

| Piece | File |
|---|---|
| Models | `dollara/api/core/agent_models.py` |
| JWT guard | `dollara/api/core/agent_auth.py` (`require_agent`) |
| Business logic | `dollara/api/core/agent_services.py` |
| HTTP layer | `dollara/api/core/agent_views.py` |
| Routes | `dollara/api/core/agent_urls.py` → mounted at `/api/v1/agent/…` |
| Schema | `dollara/api/database/init.sql` + `database/migrations/003_agent_panel.sql` |

Three rules run through the service layer and are worth knowing before changing it:

1. **Scope.** Every read is `downline_ids()` / `downline_player_ids()` first. No query
   touches `sport_bets` or `users` without one of them.
2. **Sign.** `sport_bets` money columns are stored HOUSE-positive. Exactly one function
   flips the sign for display — `_split_pl` — and every report goes through it.
3. **Casino vs sports.** Casino is `game_rounds` on a non-sports game; sports is
   `sport_bets` plus `game_rounds` on a sports-category game. `_casino_totals` and
   `_sports_totals` own that split.

### Applying the schema

```bash
mysql -u root <tenant_db> < dollara/api/database/migrations/003_agent_panel.sql
```

Safe to re-run — every ALTER is guarded and every CREATE is `IF NOT EXISTS`. `deploy.sh`
replays every file in `database/migrations/` on each deploy for exactly that reason.
