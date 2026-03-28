# LazyBudget

A personal finance tracking app built with Next.js 16, TypeScript, PostgreSQL, and the Akahu API. Track your net worth, sync accounts, manage budgets, and set financial goals.

## Features

- **Account Sync** - Automatically sync your financial accounts via Akahu API
- **Net Worth Tracking** - Monitor your overall financial health with daily snapshots
- **Budget Management** - Create and track monthly budgets across categories
- **Financial Goals** - Set and track progress toward your savings goals
- **Transaction History** - View all your transactions with detailed filtering
- **Account Grouping** - Accounts automatically categorized as assets, liabilities, or excluded
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

npm run db:push      # Push schema to DB (use during development)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio (DB GUI)

docker compose up -d    # Start PostgreSQL
docker compose down     # Stop PostgreSQL
```

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

## Pages

| Route | Status |
|---|---|
| `/dashboard` | ✅ Net worth, accounts summary, recent transactions, month summary |
| `/accounts` | ✅ All accounts grouped by asset/liability with balances |
| `/transactions` | ⏳ Under development |
| `/budget` | ⏳ Under development |
| `/insights` | ⏳ Under development |
| `/goals` | ⏳ Under development |
| `/cashflow` | ⏳ Under development |
| `/net-worth` | ⏳ Under development |

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.