import { subDays, format } from "date-fns";
import type { Transaction, EnrichedTransaction } from "akahu";
import { getAkahuForUser } from "./client";
import { db } from "../db";
import { accounts, transactions, userSettings, balanceSnapshots, syncLog } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { mapAkahuCategoryToGroup } from "../utils/categories";
import { applyRulesToTransactions } from "@/lib/queries/rules";
import {
  getMigratedId,
  migrateAccount,
  migrateTransactionOverrides,
  markMissingAccountsInactive,
} from "./migration";

function isEnriched(tx: Transaction): tx is EnrichedTransaction {
  return "merchant" in tx || "category" in tx;
}

export interface SyncResult {
  accountsSynced: number;
  transactionsSynced: number;
  durationMs: number;
}

export async function runSync(
  userId: string,
  mode: "incremental" | "full" = "incremental"
): Promise<SyncResult> {
  const startedAt = new Date();

  // Insert sync log entry
  const [logEntry] = await db
    .insert(syncLog)
    .values({ userId, startedAt, status: "RUNNING" })
    .returning({ id: syncLog.id });

  try {
    // -------------------------------------------------------------------
    // Pass 1: Sync accounts
    // -------------------------------------------------------------------
    const { client: akahuClient, userToken } = await getAkahuForUser(userId);
    const akahuAccounts = await akahuClient.accounts.list(userToken);
    const today = format(new Date(), "yyyy-MM-dd");

    for (const acc of akahuAccounts) {
      const balance = acc.balance?.current ?? null;
      const availableBalance = acc.balance?.available ?? null;

      await db
        .insert(accounts)
        .values({
          id: acc._id,
          userId,
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
          // Akahu ids are globally unique per app connection, but guard
          // against a cross-user id collision overwriting someone else's row
          setWhere: sql`${accounts.userId} = ${userId}`,
        });

      // Write balance snapshot for today (upsert so re-runs don't duplicate)
      if (balance !== null) {
        await db
          .insert(balanceSnapshots)
          .values({
            userId,
            accountId: acc._id,
            snapshotDate: today,
            balance: String(balance),
          })
          .onConflictDoNothing();
      }

      // Open banking migration: merge the replaced classic account into this one
      const accMigratedFrom = getMigratedId(acc);
      if (accMigratedFrom && accMigratedFrom !== acc._id) {
        await migrateAccount(userId, accMigratedFrom, acc._id);
      }
    }

    // Deactivate accounts Akahu no longer returns (revoked or deselected)
    await markMissingAccountsInactive(
      userId,
      akahuAccounts.map((acc) => acc._id)
    );

    // -------------------------------------------------------------------
    // Pass 2: Sync transactions
    // -------------------------------------------------------------------
    let startDate: Date;

    if (mode === "full") {
      startDate = subDays(new Date(), 730); // 2 years back
    } else {
      const [settings] = await db
        .select({ lastSyncAt: userSettings.lastSyncAt })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (settings?.lastSyncAt) {
        startDate = subDays(settings.lastSyncAt, 2); // 2-day overlap to catch late-settled transactions
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
            userId,
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
            setWhere: sql`${transactions.userId} = ${userId}`,
          });

        // Open banking migration: carry user overrides from the replaced
        // transaction onto this copy, then drop the old row
        const txMigratedFrom = getMigratedId(tx);
        if (txMigratedFrom && txMigratedFrom !== tx._id) {
          await migrateTransactionOverrides(userId, txMigratedFrom, tx._id);
        }

        txCount++;
      }

      cursor = page.cursor.next;
    } while (cursor);

    // -------------------------------------------------------------------
    // Apply transaction rules to newly synced (uncategorised) transactions
    // -------------------------------------------------------------------
    await applyRulesToTransactions(userId);

    // -------------------------------------------------------------------
    // Update lastSyncAt (after successful rule application)
    // -------------------------------------------------------------------
    const now = new Date();
    await db
      .insert(userSettings)
      .values({ userId, lastSyncAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { lastSyncAt: now, updatedAt: sql`now()` },
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

export async function canSync(
  userId: string
): Promise<{ allowed: boolean; nextAllowedAt?: Date; lastSyncAt?: Date }> {
  const [settings] = await db
    .select({ lastSyncAt: userSettings.lastSyncAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!settings?.lastSyncAt) return { allowed: true };

  const lastSync = settings.lastSyncAt;
  const nextAllowed = new Date(lastSync.getTime() + 60 * 60 * 1000); // 1 hour

  if (Date.now() < nextAllowed.getTime()) {
    return { allowed: false, nextAllowedAt: nextAllowed, lastSyncAt: lastSync };
  }

  return { allowed: true, lastSyncAt: lastSync };
}
