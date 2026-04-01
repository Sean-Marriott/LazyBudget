@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build (also validates types)
npx tsc --noEmit     # Type check only

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
- `src/lib/utils/` — `currency.ts` (NZD formatting), `dates.ts`, `accounts.ts` (type→group mapping), `categories.ts` (NZFCC colors)
- `src/components/` — UI components grouped by page (dashboard/, accounts/, layout/)
- `src/app/api/` — Route handlers (thin wrappers around query functions)

**Akahu client:** `getAkahuClient()` and `getUserToken()` in `src/lib/akahu/client.ts` are lazy getters — they throw at runtime if tokens are missing, but don't fail at build time.

**Sync strategy:** Incremental by default (fetches from `last_sync_at - 2 days`). User overrides (`userCategory`, `notes`, `isTransfer`, `isHidden`) are never overwritten by sync — the upsert explicitly excludes those columns. A 1-hour cooldown is enforced via `canSync()`.

**Account type → net worth grouping:** `getAccountGroup()` in `src/lib/utils/accounts.ts` maps all 11 Akahu account types to `asset | liability | excluded`. REWARDS accounts are excluded from NZD net worth totals.

**shadcn/ui components** live in `src/components/ui/` — add new ones with `npx shadcn@latest add <component>`.

**Path alias:** `@/*` maps to `src/*` — use this everywhere instead of relative imports.

**TypeScript types:** Always infer from schema via `$inferSelect` (e.g. `typeof accounts.$inferSelect`) — never define separate interfaces for DB entities.

**Numeric fields:** Drizzle returns `numeric(12,2)` columns as strings. Use `toNumber()` from `src/lib/utils/currency.ts` whenever reading money values from DB results.

**Category resolution order:** `userCategory` → `akahuCategory` → `'Uncategorised'`. Mirror this with `coalesce(userCategory, akahuCategory, 'Uncategorised')` in queries.

**No ESLint configured** — `npx tsc --noEmit` and `npm run build` are the only code quality gates.

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

## Pages built

| Route | Status |
|---|---|
| `/dashboard` | ✅ Net worth, accounts summary, recent transactions, month summary |
| `/accounts` | ✅ All accounts grouped by asset/liability with balances |
| `/transactions` | Stub |
| `/budget` | Stub |
| `/insights` | Stub |
| `/goals` | Stub |
| `/cashflow` | Stub |
| `/net-worth` | Stub |
