import {
  pgTable,
  text,
  numeric,
  boolean,
  serial,
  integer,
  date,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import type { RuleCondition } from "@/lib/utils/rules";
import { users } from "./auth-schema";

export * from "./auth-schema";

// ---------------------------------------------------------------------------
// Accounts — synced from Akahu
// ---------------------------------------------------------------------------
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(), // Akahu _id (acc_xxx)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)]
);

// ---------------------------------------------------------------------------
// Transactions — synced from Akahu, user overrides never overwritten by sync
// ---------------------------------------------------------------------------
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(), // Akahu _id (trans_xxx)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  },
  (t) => [index("transactions_user_id_idx").on(t.userId)]
);

// ---------------------------------------------------------------------------
// Budgets — monthly budget lines per category
// ---------------------------------------------------------------------------
export const budgets = pgTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: date("month").notNull(), // first day of month: 2026-03-01
    category: text("category").notNull(),
    budgetType: text("budget_type").notNull(), // SPEND | SAVE | INVEST | INCOME
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("budgets_user_month_category_idx").on(
      t.userId,
      t.month,
      t.category
    ),
  ]
);

// ---------------------------------------------------------------------------
// Goals — financial goals with progress tracking
// ---------------------------------------------------------------------------
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    index("balance_snapshots_user_id_idx").on(t.userId),
  ]
);

// ---------------------------------------------------------------------------
// Manual assets — user-entered offline assets (cars, computers, property, etc.)
// ---------------------------------------------------------------------------
export const manualAssets = pgTable("manual_assets", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // CHECKING | SAVINGS | CREDITCARD | LOAN | KIWISAVER
  //                              | INVESTMENT | TERMDEPOSIT | FOREIGN | WALLET
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Transaction rules — auto-categorise transactions on sync
// ---------------------------------------------------------------------------
export const transactionRules = pgTable("transaction_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  // Conditions
  conditionCombinator: text("condition_combinator").default("AND").notNull(), // "AND" | "OR"
  conditions: jsonb("conditions").$type<RuleCondition[]>().default([]).notNull(),
  // Actions — null means "don't change this field"
  setCategory: text("set_category"),
  setNotes: text("set_notes"),
  setTransfer: boolean("set_transfer"),
  setHidden: boolean("set_hidden"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Custom categories — user-defined transaction categories
// ---------------------------------------------------------------------------
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(), // hex e.g. "#e0af68"
    emoji: text("emoji"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("categories_user_name_idx").on(t.userId, t.name)]
);

// ---------------------------------------------------------------------------
// Manual account snapshots — historical balance for manual accounts
// ---------------------------------------------------------------------------
export const manualAccountSnapshots = pgTable(
  "manual_account_snapshots",
  {
    id: serial("id").primaryKey(),
    manualAccountId: integer("manual_account_id")
      .notNull()
      .references(() => manualAccounts.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("manual_account_snapshots_account_date_idx").on(
      t.manualAccountId,
      t.snapshotDate
    ),
  ]
);

// ---------------------------------------------------------------------------
// Manual asset snapshots — historical value for manual assets
// ---------------------------------------------------------------------------
export const manualAssetSnapshots = pgTable(
  "manual_asset_snapshots",
  {
    id: serial("id").primaryKey(),
    manualAssetId: integer("manual_asset_id")
      .notNull()
      .references(() => manualAssets.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("manual_asset_snapshots_asset_date_idx").on(
      t.manualAssetId,
      t.snapshotDate
    ),
  ]
);

// ---------------------------------------------------------------------------
// Sync log — history of sync runs for debugging
// ---------------------------------------------------------------------------
export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull(), // RUNNING | SUCCESS | FAILED
  accountsSynced: numeric("accounts_synced").default("0"),
  transactionsSynced: numeric("transactions_synced").default("0"),
  errorMessage: text("error_message"),
});

// ---------------------------------------------------------------------------
// User settings — per-user Akahu credentials (encrypted) and sync state
// ---------------------------------------------------------------------------
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  akahuAppToken: text("akahu_app_token"), // encrypted via src/lib/crypto.ts
  akahuUserToken: text("akahu_user_token"), // encrypted via src/lib/crypto.ts
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
