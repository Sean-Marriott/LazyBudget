import { sql, eq, isNull, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  userSettings,
  appSettings,
  accounts,
  transactions,
  budgets,
  goals,
  categories,
  manualAssets,
  manualAccounts,
  transactionRules,
  balanceSnapshots,
  syncLog,
} from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";

/**
 * Assigns all pre-multi-user (user_id IS NULL) data to the given user.
 * Only runs for the very first registered user — later signups start empty.
 * Also migrates the global last_sync_at and any env-var Akahu tokens into
 * the user's settings row so sync keeps working without manual steps.
 */
export async function claimOrphanedData(userId: string) {
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(users);
  if (userCount !== 1) return;

  const ownedTables = [
    accounts,
    transactions,
    budgets,
    goals,
    categories,
    manualAssets,
    manualAccounts,
    transactionRules,
    balanceSnapshots,
    syncLog,
  ];

  await db.transaction(async (tx) => {
    for (const table of ownedTables) {
      await tx
        .update(table)
        .set({ userId })
        .where(isNull(table.userId));
    }

    const [lastSync] = await tx
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "last_sync_at"));

    const appToken = process.env.AKAHU_APP_TOKEN;
    const userToken = process.env.AKAHU_USER_TOKEN;

    await tx
      .insert(userSettings)
      .values({
        userId,
        lastSyncAt: lastSync ? new Date(lastSync.value) : null,
        akahuAppToken: appToken ? encrypt(appToken) : null,
        akahuUserToken: userToken ? encrypt(userToken) : null,
        updatedAt: sql`now()`,
      })
      .onConflictDoNothing();
  });
}
