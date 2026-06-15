@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build (also validates types)
npx tsc --noEmit     # Type check only

npm test             # Run all tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)

npm run db:push      # Push schema to DB (use during development)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio (DB GUI)

docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
```

## First-time setup

1. Start Docker Desktop, then `docker compose up -d`
2. Copy `.env.example` to `.env.local` and set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `ENCRYPTION_KEY` (`openssl rand -hex 32` for the secrets)
3. `npm run db:push` to create all tables
4. `npm run dev`, sign up at `/signup` (the **first** registered user claims any pre-existing single-user data)
5. Add your Akahu personal-app tokens (from my.akahu.nz) on the **Settings** page, then click **Sync** in the top bar

Upgrading a bank connection to official open banking at my.akahu.nz is safe — the next sync merges the migrated account/transaction records (see "Open banking migration" below).

## Architecture

**Stack:** Next.js 16 App Router · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS · shadcn/ui · Recharts

**Data flow:**
1. User clicks Sync → `POST /api/sync` → `src/lib/akahu/sync.ts` → Akahu API → upsert into Postgres
2. Pages are async Server Components that query Postgres directly via `src/lib/queries/`
3. No client-side data fetching on the main pages — all data fetched server-side at request time

**Multi-user & auth (Better Auth):** Every user has fully isolated data. Auth tables (`users`, `sessions`, `auth_accounts`, `verifications`) live in `src/lib/db/auth-schema.ts` — the SQL table `auth_accounts` deliberately avoids colliding with the Akahu `accounts` table, mapped via the drizzleAdapter `schema` option in `src/lib/auth.ts` (do NOT enable `usePlural`). Key files:
- `src/lib/auth.ts` — Better Auth server config (email/password); a `databaseHooks.user.create.after` hook calls `claimOrphanedData()` so the first-ever registered user claims all pre-auth rows (and any legacy `AKAHU_*` env tokens are encrypted into `user_settings`)
- `src/app/api/auth/[...all]/route.ts` — auth handler; `src/lib/auth-client.ts` — React client
- `src/lib/session.ts` — `requireUser()` (pages/layouts: redirects to `/login`) and `getSessionUser()` (API routes: null → return 401)
- `src/proxy.ts` — Next 16 proxy (NOT `middleware.ts`, which is deprecated); cookie-only optimistic redirect, UX only — real enforcement is `requireUser()`/`getSessionUser()`
- Route groups: `src/app/(app)/` (all app pages; layout calls `requireUser()` and renders the Sidebar) and `src/app/(auth)/` (login/signup). URLs are unchanged.
- **Convention: every query function in `src/lib/queries/` takes `userId` as its first parameter** and filters by it; updates/deletes include `userId` in the `where` — an empty `returning()` doubles as the ownership check (caller returns 404). Every API route handler resolves `getSessionUser()` first and 401s without a session.

**Akahu tokens are per-user**, stored AES-256-GCM-encrypted (`src/lib/crypto.ts`, key = `ENCRYPTION_KEY` env var) in the `user_settings` table, managed via the Settings page (`PUT/DELETE /api/settings/akahu`). `getAkahuForUser(userId)` in `src/lib/akahu/client.ts` decrypts and returns `{ client, userToken }`, throwing `AkahuNotConfiguredError` (→ 409 `akahu_not_configured` from `/api/sync`, surfaced by `SyncButton`) when unset.

**Key directories:**
- `src/lib/db/schema.ts` — single source of truth for all table definitions; TypeScript types are inferred from here
- `src/lib/akahu/` — `client.ts` (lazy AkahuClient), `sync.ts` (full sync logic)
- `src/lib/queries/` — reusable DB query functions used by API routes and pages
- `src/lib/utils/` — `currency.ts` (NZD formatting), `dates.ts`, `accounts.ts` (type→group mapping), `categories.ts` (NZFCC colors), `rules.ts` (rule condition types/labels)
- `src/components/` — UI components grouped by page (dashboard/, accounts/, layout/)
- `src/app/api/` — Route handlers (thin wrappers around query functions)

**Sync strategy:** Per-user. Incremental by default (fetches from `user_settings.lastSyncAt - 2 days`). User overrides (`userCategory`, `notes`, `isTransfer`, `isHidden`) are never overwritten by sync — the upsert explicitly excludes those columns. A 1-hour per-user cooldown is enforced via `canSync(userId)`. All sync upserts include `userId` and the migration helpers in `src/lib/akahu/migration.ts` are user-scoped (notably `markMissingAccountsInactive` — never let it run unscoped or it would deactivate other users' accounts).

**Open banking migration:** When a bank connection is upgraded from classic to official open banking (at my.akahu.nz), Akahu issues new account ids and copies up to 1 year of transactions with new ids, referencing each replaced record's id in a `_migrated` field. `src/lib/akahu/migration.ts` handles this during sync: `migrateAccount()` re-points balance snapshots, old transactions, and goals to the new account id and deletes the old row; `migrateTransactionOverrides()` carries user overrides onto the migrated copy and deletes the old transaction; `markMissingAccountsInactive()` deactivates accounts Akahu no longer returns. Upgrading a connection is safe — the next sync merges the migrated records.

**Account type → net worth grouping:** `getAccountGroup()` in `src/lib/utils/accounts.ts` maps all 11 Akahu account types to `asset | liability | excluded`. REWARDS accounts are excluded from NZD net worth totals.

**Other Assets (manual assets):** `src/lib/queries/manual-assets.ts` provides CRUD for the `manual_assets` table. These are fully separate from Akahu sync — no risk of overwrites. `getNetWorthSummary()` in `src/lib/queries/accounts.ts` sums their values into the assets total. The `/accounts` page renders them via `OtherAssetsSection` (client component wrapper), `ManualAssetCard`, and `ManualAssetDialog`.

**Manual Accounts:** `src/lib/queries/manual-accounts.ts` provides CRUD for the `manual_accounts` table — for accounts at banks not connected to Akahu. Supports the same account types as Akahu (CHECKING, SAVINGS, CREDITCARD, LOAN, etc., excluding TAX and REWARDS). `getAccountGroup()` determines asset/liability classification; `getNetWorthSummary()` includes them accordingly. The `/accounts` page renders them via `ManualAccountsSection`, `ManualAccountCard`, and `ManualAccountDialog`.

**Transaction rules:** `src/lib/queries/rules.ts` provides CRUD and `applyRulesToTransactions()`. Rules store conditions as a JSONB array (`conditions: RuleCondition[]`) with a `conditionCombinator` ("AND" | "OR"). `applyRulesToTransactions()` only targets transactions where `userCategory IS NULL` — never overwrites manual edits. Rules are evaluated in creation order (id ASC); first match wins. Called automatically at the end of every sync. The `/rules` page renders them via `RulesSection`, `RuleCard`, and `RuleDialog`.

**shadcn/ui components** live in `src/components/ui/` — add new ones with `npx shadcn@latest add <component>`.

**Path alias:** `@/*` maps to `src/*` — use this everywhere instead of relative imports.

**TypeScript types:** Always infer from schema via `$inferSelect` (e.g. `typeof accounts.$inferSelect`) — never define separate interfaces for DB entities.

**Numeric fields:** Drizzle returns `numeric(12,2)` columns as strings. Use `toNumber()` from `src/lib/utils/currency.ts` whenever reading money values from DB results.

**Category resolution order:** `userCategory` → `akahuCategory` → `'Uncategorised'`. Mirror this with `coalesce(userCategory, akahuCategory, 'Uncategorised')` in queries.

**No ESLint configured** — `npx tsc --noEmit` and `npm run build` are the only code quality gates.

## Automated tests

**Framework:** Vitest · `@testing-library/jest-dom` (jsdom environment, globals enabled)

**Run tests:**
```bash
npm test             # single run
npm run test:watch   # watch mode
```

**Config:** [`vitest.config.ts`](vitest.config.ts) — includes `src/**/*.test.{ts,tsx}`, jsdom environment, setup file at `src/test/setup.ts`.

**Existing test files:**

| File | What it covers |
|---|---|
| `src/app/api/rules/route.test.ts` | POST `/api/rules` — validation and creation |
| `src/app/api/rules/[id]/route.test.ts` | PATCH/DELETE `/api/rules/[id]` — id validation, field validation, update logic, deletion |
| `src/app/api/transactions/[id]/route.test.ts` | PATCH `/api/transactions/[id]` |
| `src/lib/queries/rules.test.ts` | `applyRulesToTransactions` — matching, AND/OR combinators, first-match-wins |
| `src/lib/akahu/migration.test.ts` | Open banking migration helpers — `getMigratedId`, account/transaction merging, inactive marking |
| `src/lib/queries/transactions.test.ts` | Query helpers for transactions |

**Conventions:**
- DB and external dependencies are mocked with `vi.hoisted(() => vi.fn())` — no real DB needed.
- Route handler tests construct `Request` objects directly and call the exported handler functions (e.g. `PATCH`, `DELETE`).
- `params` are passed as `{ params: Promise.resolve({ id }) }` to match the Next.js 16 async params signature.

## Database schema overview

| Table | Purpose |
|---|---|
| `users`, `sessions`, `auth_accounts`, `verifications` | Better Auth tables (`src/lib/db/auth-schema.ts`) |
| `user_settings` | Per-user encrypted Akahu tokens + `lastSyncAt` (sync cooldown) |
| `accounts` | Synced Akahu accounts with current balances |
| `transactions` | All transactions; user overrides never overwritten by sync |
| `budgets` | Monthly budget lines (SPEND/SAVE/INVEST/INCOME per category) |
| `goals` | Financial goals with progress |
| `app_settings` | Legacy key/value store (pre-auth `last_sync_at`; superseded by `user_settings`) |
| `balance_snapshots` | One row per account per sync day — powers net worth history |
| `sync_log` | History of sync runs |
| `manual_assets` | User-managed offline assets (cars, property, etc.) with emoji, value, and notes |
| `manual_accounts` | User-managed accounts not connected to Akahu (foreign banks, cash, etc.) |
| `transaction_rules` | Auto-categorisation rules; `conditions` is JSONB array of `{field, operator, value}`; `conditionCombinator` is "AND" \| "OR" |
| `manual_account_snapshots` | Historical balance entries for manual accounts — written via "Update Value" action |
| `manual_asset_snapshots` | Historical value entries for manual assets — written via "Update Value" action |

**Custom categories:** `src/lib/queries/categories.ts` provides CRUD for the `categories` table. Custom categories can be assigned to transactions (via `userCategory`) and override Akahu's built-in categorisation. Each has a hex color and optional emoji. The `/categories` page renders them via `CategoryCard` and `CategoryDialog` (which uses `react-colorful` for color picking). Custom category colors are threaded through transaction and insight charts via a `customColorMap`.

**Manual value history:** Manual accounts and assets support historical snapshots via `manual_account_snapshots` and `manual_asset_snapshots` tables. Snapshots are recorded explicitly via an "Update Value" dialog (↻ button on each card) — distinct from the Edit dialog which is for correcting mistakes. API routes: `POST /api/manual-accounts/[id]/snapshots` and `POST /api/manual-assets/[id]/snapshots`. These power per-account sparklines and net worth history on the Insights page.

**Insights:** `src/lib/queries/insights.ts` has four query functions — `getNetWorthHistory`, `getAccountBalanceHistories`, `getMonthlyTrends`, `getMonthlyCategoryTrends`. Net worth history forward-fills manual snapshot values to align with daily Akahu snapshots. The `/insights` page has a `?range=3m|6m|1y|all` URL param controlling the time window. A compact preview (90-day net worth + 6-month income/spending) also appears on the dashboard.

**Note on `db:push` from host:** The `.env.local` `DATABASE_URL` uses `postgres` (Docker network hostname). Running `npm run db:push` from the host requires overriding: `DATABASE_URL=postgresql://lazybudget:lazybudget@localhost:5433/lazybudget npm run db:push`.

## Pages built

| Route | Status |
|---|---|
| `/dashboard` | ✅ Net worth, accounts summary, recent transactions, month summary, compact insights preview |
| `/accounts` | ✅ All accounts grouped by asset/liability with balances; Manual Accounts and Other Assets sections with "Update Value" history tracking |
| `/transactions` | ✅ Transaction browser with month/category/search filters; click row to edit |
| `/rules` | ✅ Transaction rules with AND/OR multi-condition support; auto-applies on sync |
| `/categories` | ✅ Custom category CRUD with color picker and emoji |
| `/insights` | ✅ Net worth trend, per-account sparklines, monthly income/spending, top-5 category trends; toggleable time range |
| `/cashflow` | ✅ Income vs spending Sankey diagram with month selector |
| `/settings` | ✅ Account info + per-user Akahu token management (encrypted at rest) |
| `/login`, `/signup` | ✅ Better Auth email/password; first signup claims pre-auth data |
| `/budget` | Stub |
| `/goals` | Stub |
