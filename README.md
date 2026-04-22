# LazyBudget

A personal finance tracking app built with Next.js 16, TypeScript, PostgreSQL, and the Akahu API. Track your net worth, sync accounts, manage budgets, and set financial goals.

## Features

- **Account Sync** - Automatically sync your financial accounts via Akahu API
- **Net Worth Tracking** - Monitor your overall financial health with daily snapshots and historical trend charts
- **Insights** - Net worth trends, per-account sparklines, monthly income/spending, and top spending category trends with toggleable time ranges (3M / 6M / 1Y / All)
- **Transaction History** - View and filter all transactions by month, category, or keyword
- **Transaction Rules** - Auto-categorise recurring transactions with AND/OR multi-condition rules that run on every sync
- **Custom Categories** - Create custom transaction categories with color picker and emoji
- **Cashflow** - Income vs spending Sankey diagram with month selector
- **Account Grouping** - Accounts automatically categorized as assets, liabilities, or excluded
- **Other Assets** - Manually track offline assets (cars, property, equipment) with value history over time
- **Manual Accounts** - Track accounts at banks not connected to Akahu with balance history over time
- **Budget Management** - Create and track monthly budgets across categories *(coming soon)*
- **Financial Goals** - Set and track progress toward your savings goals *(coming soon)*
- **Multi-User Support** - User accounts with individual Akahu API tokens *(planned)*
- **Client-Side Sync Control** - Manual sync button with cooldown enforcement

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **API**: Akahu API for financial data

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL)
- Akahu account with personal app tokens

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the placeholder `.env.local.example` file:

```bash
cp .env.local.example .env.local
```

Add your Akahu tokens to `.env.local`:

- `AKAHU_USER_TOKEN` — from my.akahu.nz personal app
- `AKAHU_APP_TOKEN` — from my.akahu.nz personal app

### 4. Set up the database

Push the schema to PostgreSQL:

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Sync your accounts

1. Navigate to the app
2. Click the **Sync** button in the top navigation
3. Your accounts and transactions will be imported

## Development Commands

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

## Automated Tests

**Framework:** [Vitest](https://vitest.dev) with `@testing-library/jest-dom` (jsdom environment).

Tests live alongside the code they cover as `*.test.ts` files under `src/`. No real database is required — all DB and external dependencies are mocked via `vi.hoisted(() => vi.fn())`. Route handler tests construct `Request` objects directly and call the exported handler functions, matching Next.js 16's async params signature (`{ params: Promise<{ id: string }> }`).

| Test file | What it covers |
|---|---|
| `src/app/api/rules/route.test.ts` | POST `/api/rules` — body validation and rule creation |
| `src/app/api/rules/[id]/route.test.ts` | PATCH/DELETE `/api/rules/[id]` — id validation, field validation, update logic, deletion |
| `src/app/api/transactions/[id]/route.test.ts` | PATCH `/api/transactions/[id]` — transaction update validation |
| `src/lib/queries/rules.test.ts` | `applyRulesToTransactions` — condition matching, AND/OR combinators, first-match-wins behaviour |
| `src/lib/queries/transactions.test.ts` | Transaction query helpers |

## Architecture

### Data Flow

1. User clicks Sync → `POST /api/sync` → `src/lib/akahu/sync.ts` → Akahu API → upsert into Postgres
2. Pages are async Server Components that query Postgres directly via `src/lib/queries/`
3. No client-side data fetching on the main pages — all data fetched server-side at request time

### Key Directories

- `src/lib/db/schema.ts` — Single source of truth for all table definitions; TypeScript types are inferred from here
- `src/lib/akahu/` — Akahu client and sync logic
  - `client.ts` — Lazy AkahuClient with token validation
  - `sync.ts` — Full sync logic with incremental fetching and user override protection
- `src/lib/queries/` — Reusable DB query functions used by API routes and pages
- `src/lib/utils/` — Utility functions:
  - `currency.ts` — NZD formatting
  - `dates.ts` — Date utilities
  - `accounts.ts` — Account type → group mapping
  - `categories.ts` — NZFCC category colors
  - `rules.ts` — Rule condition types and labels
- `src/components/` — UI components grouped by page (dashboard/, accounts/, layout/)
- `src/app/api/` — Route handlers (thin wrappers around query functions)

### Akahu Client

`getAkahuClient()` and `getUserToken()` in `src/lib/akahu/client.ts` are lazy getters — they throw at runtime if tokens are missing, but don't fail at build time.

### Sync Strategy

- Incremental by default (fetches from `last_sync_at - 2 days`)
- User overrides (`userCategory`, `notes`, `isTransfer`, `isHidden`) are never overwritten by sync — the upsert explicitly excludes those columns
- 1-hour cooldown enforced via `canSync()`

### Account Type → Net Worth Grouping

`getAccountGroup()` in `src/lib/utils/accounts.ts` maps all 11 Akahu account types to `asset | liability | excluded`. REWARDS accounts are excluded from NZD net worth totals.

## Database Schema

| Table | Purpose |
|---|---|
| `accounts` | Synced Akahu accounts with current balances |
| `transactions` | All transactions; user overrides never overwritten by sync |
| `budgets` | Monthly budget lines (SPEND/SAVE/INVEST/INCOME per category) |
| `goals` | Financial goals with progress |
| `app_settings` | Key/value store; holds `last_sync_at` |
| `balance_snapshots` | One row per account per sync day — powers net worth history |
| `sync_log` | History of sync runs |
| `manual_assets` | User-managed offline assets with emoji, value, and notes |
| `manual_accounts` | User-managed accounts not connected to Akahu (foreign banks, cash, etc.) |
| `transaction_rules` | Auto-categorisation rules with JSONB conditions array and AND/OR combinator |
| `categories` | User-defined transaction categories with hex color and emoji |
| `manual_account_snapshots` | Historical balance entries for manual accounts (recorded via "Update Value") |
| `manual_asset_snapshots` | Historical value entries for manual assets (recorded via "Update Value") |

## Pages

| Route | Status |
|---|---|
| `/dashboard` | ✅ Net worth, accounts summary, recent transactions, month summary, compact insights preview |
| `/accounts` | ✅ All accounts grouped by asset/liability; Manual Accounts and Other Assets with "Update Value" history tracking |
| `/transactions` | ✅ Transaction browser with month/category/search filters; click to edit |
| `/rules` | ✅ Transaction rules with AND/OR multi-condition support; auto-applies on sync |
| `/categories` | ✅ Custom category CRUD with color picker and emoji |
| `/insights` | ✅ Net worth trend, per-account sparklines, monthly income/spending, top-5 category trends |
| `/cashflow` | ✅ Income vs spending Sankey diagram with month selector |
| `/budget` | ⏳ Under development |
| `/goals` | ⏳ Under development |

## Project Structure

```
lazy-budget/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── sync/route.ts           # Sync API endpoint
│   │   ├── dashboard/page.tsx          # Main dashboard
│   │   ├── accounts/page.tsx          # Accounts list
│   │   └── [other pages]/
│   ├── lib/
│   │   ├── akahu/
│   │   │   ├── client.ts               # Akahu API client
│   │   │   └── sync.ts                 # Sync logic
│   │   ├── db/
│   │   │   └── schema.ts               # Database schema
│   │   ├── queries/                    # DB query functions
│   │   └── utils/                      # Utility functions
│   └── components/
│       ├── ui/                         # shadcn/ui components
│       └── [page components]/
├── .env.local.example                  # Environment variables template
├── docker-compose.yml                  # PostgreSQL configuration
├── drizzle.config.ts                   # Drizzle ORM config
└── package.json
```

## Deployment

See [Vercel Documentation](https://nextjs.org/docs/app/building-your-application/deploying) for deployment details.

## About This Project

LazyBudget is a personal project built primarily as a playground for experimenting with AI coding agents — specifically to explore how tools like Claude Code can assist with real-world software development tasks end-to-end. The finance app itself is the vehicle; the real interest is in the development process.

### Akahu Personal Plan

Financial data is sourced via [Akahu](https://www.akahu.nz), New Zealand's open finance platform. This project uses an Akahu **Personal App** — a free plan that gives API access to your own bank accounts and financial data. Key details:

- **Cost:** Free for personal use
- **Setup:** Create a profile at [my.akahu.nz](https://my.akahu.nz), connect your bank accounts, complete identity verification, and enable MFA
- **API access:** Personal Apps provide read access to your own account and transaction data; payment/transfer permissions are disabled by default
- **Not for commercial use:** The personal plan is for individuals accessing their own data only — see [Akahu's pricing page](https://www.akahu.nz/pricing) for business/developer plans

## License

This project is private and proprietary.