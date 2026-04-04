import {
  pgTable,
  text,
  numeric,
  boolean,
  serial,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Accounts — synced from Akahu
// ---------------------------------------------------------------------------
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(), // Akahu _id (acc_xxx)
  name: text("name").notNull(),
  status: text("status").notNull(), // ACTIVE | INACTIVE
  type: text("type").notNull(), // CHECKING | SAVINGS | CREDITCARD | LOAN | KIWISAVER
  //                              | INVESTMENT | TERMDEPOSIT | FOREIGN | TAX | REWARDS | WALLET
  currency: text("currency").notNull().default("NZD"),
  balance: numeric("balance", { precision: 12, scale: 2 }),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }),
  connectionName: text("connection_name"),
  connectionLogo: text("connection_logo"),
  formattedAccount: text("formatted_account"),
  lastRefreshed: timestamp("last_refreshed", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Transactions — synced from Akahu, user overrides never overwritten by sync
// ---------------------------------------------------------------------------
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(), // Akahu _id (trans_xxx)
  accountId: text("account_id").references(() => accounts.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }),
  type: text("type"), // CREDIT | DEBIT | PAYMENT | TRANSFER | EFTPOS | etc
  // Akahu enrichment
  akahuCategoryCode: text("akahu_category_code"),
  akahuCategoryName: text("akahu_category_name"),
  akahuCategoryGroup: text("akahu_category_group"),
  merchantName: text("merchant_name"),
  merchantId: text("merchant_id"),
  // User overrides — never overwritten by sync
  userCategory: text("user_category"),
  notes: text("notes"),
  isTransfer: boolean("is_transfer").default(false),
  isHidden: boolean("is_hidden").default(false),
  // Bank metadata
  particulars: text("particulars"),
  reference: text("reference"),
  code: text("code"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Budgets — monthly budget lines per category
// ---------------------------------------------------------------------------
export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    month: date("month").notNull(), // first day of month: 2026-03-01
    category: text("category").notNull(),
    budgetType: text("budget_type").notNull(), // SPEND | SAVE | INVEST | INCOME
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("budgets_month_category_idx").on(t.month, t.category)]
);

// ---------------------------------------------------------------------------
// Goals — financial goals with progress tracking
// ---------------------------------------------------------------------------
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 12, scale: 2 }).default(
    "0"
  ),
  targetDate: date("target_date"),
  accountId: text("account_id").references(() => accounts.id),
  status: text("status").default("ACTIVE"), // ACTIVE | COMPLETED | PAUSED
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// App settings — key/value store for sync state and user preferences
// ---------------------------------------------------------------------------
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Balance snapshots — written on each sync, powers net worth history
// ---------------------------------------------------------------------------
export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: serial("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    snapshotDate: date("snapshot_date").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    uniqueIndex("balance_snapshots_account_date_idx").on(
      t.accountId,
      t.snapshotDate
    ),
  ]
);

// ---------------------------------------------------------------------------
// Manual assets — user-entered offline assets (cars, computers, property, etc.)
// ---------------------------------------------------------------------------
export const manualAssets = pgTable("manual_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Manual accounts — user-entered accounts not connected to Akahu
// ---------------------------------------------------------------------------
export const manualAccounts = pgTable("manual_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // CHECKING | SAVINGS | CREDITCARD | LOAN | KIWISAVER
  //                              | INVESTMENT | TERMDEPOSIT | FOREIGN | WALLET
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Sync log — history of sync runs for debugging
// ---------------------------------------------------------------------------
export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull(), // RUNNING | SUCCESS | FAILED
  accountsSynced: numeric("accounts_synced").default("0"),
  transactionsSynced: numeric("transactions_synced").default("0"),
  errorMessage: text("error_message"),
});
