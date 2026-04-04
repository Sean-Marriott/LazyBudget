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
2. Add real tokens to `.env.local` (copy the placeholder file):
   - `AKAHU_USER_TOKEN` — from my.akahu.nz personal app
   - `AKAHU_APP_TOKEN` — from my.akahu.nz personal app
3. `npm run db:push` to create all tables
4. `npm run dev`, then click **Sync** in the top bar

## Architecture

**Stack:** Next.js 16 App Router · TypeScript · PostgreSQL · Drizzle ORM · Tailwind CSS · shadcn/ui · Recharts

**Data flow:**
1. User clicks Sync → `POST /api/sync` → `src/lib/akahu/sync.ts` → Akahu API → upsert into Postgres
2. Pages are async Server Components that query Postgres directly via `src/lib/queries/`
3. No client-side data fetching on the main pages — all data fetched server-side at request time

**Key directories:**
- `src/lib/db/schema.ts` — single source of truth for all table definitions; TypeScript types are inferred from here
- `src/lib/akahu/` — `client.ts` (lazy AkahuClient), `sync.ts` (full sync logic)
- `src/lib/queries/` — reusable DB query functions used by API routes and pages
- `src/lib/utils/` — `currency.ts` (NZD formatting), `dates.ts`, `accounts.ts` (type→group mapping), `categories.ts` (NZFCC colors), `rules.ts` (rule condition types/labels)
- `src/components/` — UI components grouped by page (dashboard/, accounts/, layout/)
- `src/app/api/` — Route handlers (thin wrappers around query functions)

**Akahu client:** `getAkahuClient()` and `getUserToken()` in `src/lib/akahu/client.ts` are lazy getters — they throw at runtime if tokens are missing, but don't fail at build time.

**Sync strategy:** Incremental by default (fetches from `last_sync_at - 2 days`). User overrides (`userCategory`, `notes`, `isTransfer`, `isHidden`) are never overwritten by sync — the upsert explicitly excludes those columns. A 1-hour cooldown is enforced via `canSync()`.

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
| `src/lib/queries/transactions.test.ts` | Query helpers for transactions |

**Conventions:**
- DB and external dependencies are mocked with `vi.hoisted(() => vi.fn())` — no real DB needed.
- Route handler tests construct `Request` objects directly and call the exported handler functions (e.g. `PATCH`, `DELETE`).
- `params` are passed as `{ params: Promise.resolve({ id }) }` to match the Next.js 16 async params signature.

## Database schema overview

| Table | Purpose |
|---|---|
| `accounts` | Synced Akahu accounts with current balances |
| `transactions` | All transactions; user overrides never overwritten by sync |
| `budgets` | Monthly budget lines (SPEND/SAVE/INVEST/INCOME per category) |
| `goals` | Financial goals with progress |
| `app_settings` | Key/value store; holds `last_sync_at` |
| `balance_snapshots` | One row per account per sync day — powers net worth history |
| `sync_log` | History of sync runs |
| `manual_assets` | User-managed offline assets (cars, property, etc.) with emoji, value, and notes |
| `manual_accounts` | User-managed accounts not connected to Akahu (foreign banks, cash, etc.) |
| `transaction_rules` | Auto-categorisation rules; `conditions` is JSONB array of `{field, operator, value}`; `conditionCombinator` is "AND" \| "OR" |

## Pages built

| Route | Status |
|---|---|
| `/dashboard` | ✅ Net worth, accounts summary, recent transactions, month summary |
| `/accounts` | ✅ All accounts grouped by asset/liability with balances; Manual Accounts and Other Assets sections for manual entries |
| `/transactions` | ✅ Transaction browser with month/category/search filters; click row to edit |
| `/rules` | ✅ Transaction rules with AND/OR multi-condition support; auto-applies on sync |
| `/budget` | Stub |
| `/insights` | Stub |
| `/goals` | Stub |
| `/cashflow` | ✅ Income vs spending Sankey diagram with month selector |
| `/net-worth` | Stub |
