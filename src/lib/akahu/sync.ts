import { subDays, format } from "date-fns";
import type { Transaction, EnrichedTransaction } from "akahu";
import { getAkahuClient, getUserToken } from "./client";
import { db } from "../db";
import { accounts, transactions, appSettings, balanceSnapshots, syncLog } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { mapAkahuCategoryToGroup } from "../utils/categories";
import { applyRulesToTransactions } from "@/lib/queries/rules";

function isEnriched(tx: Transaction): tx is EnrichedTransaction {
  return "merchant" in tx || "category" in tx;
}

export interface SyncResult {
  accountsSynced: number;
  transactionsSynced: number;
  durationMs: number;
}

export async function runSync(mode: "incremental" | "full" = "incremental"): Promise<SyncResult> {
  const startedAt = new Date();

  // Insert sync log entry
  const [logEntry] = await db
    .insert(syncLog)
    .values({ startedAt, status: "RUNNING" })
    .returning({ id: syncLog.id });

  try {
    // -------------------------------------------------------------------
    // Pass 1: Sync accounts
    // -------------------------------------------------------------------
    const akahuClient = getAkahuClient();
    const userToken = getUserToken();
    const akahuAccounts = await akahuClient.accounts.list(userToken);
    const today = format(new Date(), "yyyy-MM-dd");

    for (const acc of akahuAccounts) {
      const balance = acc.balance?.current ?? null;
      const availableBalance = acc.balance?.available ?? null;

      await db
        .insert(accounts)
        .values({
          id: acc._id,
          name: acc.name,
          status: acc.status,
          type: acc.type,
          currency: acc.balance?.currency ?? "NZD",
          balance: balance !== null ? String(balance) : null,
          availableBalance: availableBalance !== null ? String(availableBalance) : null,
          connectionName: acc.connection.name,
          connectionLogo: acc.connection.logo,
          formattedAccount: acc.formatted_account ?? null,
          lastRefreshed: acc.refreshed?.balance ? new Date(acc.refreshed.balance) : null,
        })
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            name: sql`excluded.name`,
            status: sql`excluded.status`,
            type: sql`excluded.type`,
            currency: sql`excluded.currency`,
            balance: sql`excluded.balance`,
            availableBalance: sql`excluded.available_balance`,
            connectionName: sql`excluded.connection_name`,
            connectionLogo: sql`excluded.connection_logo`,
            formattedAccount: sql`excluded.formatted_account`,
            lastRefreshed: sql`excluded.last_refreshed`,
            updatedAt: sql`now()`,
          },
        });

      // Write balance snapshot for today (upsert so re-runs don't duplicate)
      if (balance !== null) {
        await db
          .insert(balanceSnapshots)
          .values({
            accountId: acc._id,
            snapshotDate: today,
            balance: String(balance),
          })
          .onConflictDoNothing();
      }
    }

    // -------------------------------------------------------------------
    // Pass 2: Sync transactions
    // -------------------------------------------------------------------
    let startDate: Date;

    if (mode === "full") {
      startDate = subDays(new Date(), 730); // 2 years back
    } else {
      const lastSyncSetting = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "last_sync_at"))
        .limit(1);

      if (lastSyncSetting.length > 0) {
        const lastSync = new Date(lastSyncSetting[0].value);
        startDate = subDays(lastSync, 2); // 2-day overlap to catch late-settled transactions
      } else {
        startDate = subDays(new Date(), 90); // First run: 90 days
      }
    }

    let txCount = 0;
    let cursor: string | null | undefined = undefined;

    do {
      const page = await akahuClient.transactions.list(userToken, {
        start: startDate.toISOString(),
        cursor,
      });

      for (const tx of page.items) {
        const enriched = isEnriched(tx) ? tx : null;
        const meta = enriched && "meta" in enriched ? enriched.meta : null;
        const category = enriched?.category;
        const merchant = enriched?.merchant;

        // Map NZFCC category name to our own display group.
        // Akahu's personal_finance broad group (e.g. "Lifestyle") is too coarse
        // — "cafes", "fast food", and "gambling" all map to it.
        // We use the specific category.name to produce a better group.
        const broadGroup = category?.groups?.personal_finance?.name ?? null;
        const categoryGroup = category
          ? mapAkahuCategoryToGroup(category.name, broadGroup)
          : null;

        await db
          .insert(transactions)
          .values({
            id: tx._id,
            accountId: tx._account,
            date: new Date(tx.date),
            description: tx.description,
            amount: String(tx.amount),
            balance: tx.balance != null ? String(tx.balance) : null,
            type: tx.type,
            akahuCategoryCode: category?._id ?? null,
            akahuCategoryName: category?.name ?? null,
            akahuCategoryGroup: categoryGroup,
            merchantName: merchant?.name ?? null,
            merchantId: merchant?._id ?? null,
            particulars: meta?.particulars ?? null,
            reference: meta?.reference ?? null,
            code: meta?.code ?? null,
          })
          .onConflictDoUpdate({
            target: transactions.id,
            set: {
              // Update Akahu data but never overwrite user overrides
              accountId: sql`excluded.account_id`,
              date: sql`excluded.date`,
              description: sql`excluded.description`,
              amount: sql`excluded.amount`,
              balance: sql`excluded.balance`,
              type: sql`excluded.type`,
              akahuCategoryCode: sql`excluded.akahu_category_code`,
              akahuCategoryName: sql`excluded.akahu_category_name`,
              akahuCategoryGroup: sql`excluded.akahu_category_group`,
              merchantName: sql`excluded.merchant_name`,
              merchantId: sql`excluded.merchant_id`,
              particulars: sql`excluded.particulars`,
              reference: sql`excluded.reference`,
              code: sql`excluded.code`,
              syncedAt: sql`now()`,
              // DO NOT update: userCategory, notes, isTransfer, isHidden
            },
          });

        txCount++;
      }

      cursor = page.cursor.next;
    } while (cursor);

    // -------------------------------------------------------------------
    // Apply transaction rules to newly synced (uncategorised) transactions
    // -------------------------------------------------------------------
    await applyRulesToTransactions();

    // -------------------------------------------------------------------
    // Update last_sync_at (after successful rule application)
    // -------------------------------------------------------------------
    const now = new Date().toISOString();
    await db
      .insert(appSettings)
      .values({ key: "last_sync_at", value: now })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: now, updatedAt: sql`now()` },
      });

    const durationMs = Date.now() - startedAt.getTime();

    // Update sync log
    await db
      .update(syncLog)
      .set({
        completedAt: new Date(),
        status: "SUCCESS",
        accountsSynced: String(akahuAccounts.length),
        transactionsSynced: String(txCount),
      })
      .where(eq(syncLog.id, logEntry.id));

    return {
      accountsSynced: akahuAccounts.length,
      transactionsSynced: txCount,
      durationMs,
    };
  } catch (error) {
    await db
      .update(syncLog)
      .set({
        completedAt: new Date(),
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(syncLog.id, logEntry.id));

    throw error;
  }
}

export async function canSync(): Promise<{ allowed: boolean; nextAllowedAt?: Date; lastSyncAt?: Date }> {
  const setting = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "last_sync_at"))
    .limit(1);

  if (setting.length === 0) return { allowed: true };

  const lastSync = new Date(setting[0].value);
  const nextAllowed = new Date(lastSync.getTime() + 60 * 60 * 1000); // 1 hour

  if (Date.now() < nextAllowed.getTime()) {
    return { allowed: false, nextAllowedAt: nextAllowed, lastSyncAt: lastSync };
  }

  return { allowed: true, lastSyncAt: lastSync };
}
