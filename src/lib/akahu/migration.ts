import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db";
import { accounts, transactions, balanceSnapshots, goals } from "../db/schema";

// ---------------------------------------------------------------------------
// Open banking migration support.
//
// When a user upgrades a classic bank connection to official open banking
// (https://developers.akahu.nz/docs/official-open-banking-migration), Akahu
// creates new account records (new _id) and copies up to 1 year of
// transactions across with new ids. The replaced record's id is referenced in
// a `_migrated` field on the new record. The helpers here merge those new
// records with our existing rows so balances, history, and user overrides
// survive the switch.
// ---------------------------------------------------------------------------

// The akahu SDK (2.5.1) doesn't declare `_migrated`, and Akahu's docs don't
// pin down its shape, so accept either a bare id string or an object holding
// the id under a known key.
const MIGRATED_ID_KEYS = ["_id", "_account", "_transaction", "id"];

export function getMigratedId(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const migrated = (record as Record<string, unknown>)._migrated;
  if (typeof migrated === "string") return migrated || null;
  if (migrated && typeof migrated === "object") {
    for (const key of MIGRATED_ID_KEYS) {
      const value = (migrated as Record<string, unknown>)[key];
      if (typeof value === "string" && value) return value;
    }
  }
  return null;
}

/**
 * Merge a replaced classic account into its open banking successor.
 * Re-points balance snapshots (keeping net worth history continuous),
 * transactions older than the copied window, and goals, then deletes the old
 * account row. The new account must already exist. Returns false if the old
 * account isn't in our DB (nothing to do).
 */
export async function migrateAccount(oldId: string, newId: string): Promise<boolean> {
  const existing = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, oldId))
    .limit(1);
  if (existing.length === 0) return false;

  // Drop old-account snapshots for dates the new account already covers,
  // then move the rest across (unique on account_id + snapshot_date).
  await db.delete(balanceSnapshots).where(
    and(
      eq(balanceSnapshots.accountId, oldId),
      inArray(
        balanceSnapshots.snapshotDate,
        db
          .select({ snapshotDate: balanceSnapshots.snapshotDate })
          .from(balanceSnapshots)
          .where(eq(balanceSnapshots.accountId, newId))
      )
    )
  );
  await db
    .update(balanceSnapshots)
    .set({ accountId: newId })
    .where(eq(balanceSnapshots.accountId, oldId));

  await db
    .update(transactions)
    .set({ accountId: newId })
    .where(eq(transactions.accountId, oldId));

  await db.update(goals).set({ accountId: newId }).where(eq(goals.accountId, oldId));

  await db.delete(accounts).where(eq(accounts.id, oldId));
  return true;
}

/**
 * Carry user overrides from a replaced transaction onto its migrated copy,
 * then delete the old row so it isn't double counted. Overrides already set
 * on the new row win, so re-syncs never clobber later edits. The new
 * transaction must already exist. Returns false if the old transaction isn't
 * in our DB.
 */
export async function migrateTransactionOverrides(
  oldId: string,
  newId: string
): Promise<boolean> {
  const [old] = await db
    .select({
      userCategory: transactions.userCategory,
      notes: transactions.notes,
      isTransfer: transactions.isTransfer,
      isHidden: transactions.isHidden,
    })
    .from(transactions)
    .where(eq(transactions.id, oldId))
    .limit(1);
  if (!old) return false;

  await db
    .update(transactions)
    .set({
      userCategory: sql`coalesce(${transactions.userCategory}, ${old.userCategory})`,
      notes: sql`coalesce(${transactions.notes}, ${old.notes})`,
      isTransfer: sql`${transactions.isTransfer} or ${old.isTransfer ?? false}`,
      isHidden: sql`${transactions.isHidden} or ${old.isHidden ?? false}`,
    })
    .where(eq(transactions.id, newId));

  await db.delete(transactions).where(eq(transactions.id, oldId));
  return true;
}

/**
 * Deactivate Akahu accounts that no longer come back from accounts.list —
 * e.g. a classic connection revoked after migration, or accounts deselected
 * during re-authorisation. Skipped when the list is empty so a bad API
 * response can't wipe out every account.
 */
export async function markMissingAccountsInactive(activeIds: string[]): Promise<void> {
  if (activeIds.length === 0) return;
  await db
    .update(accounts)
    .set({ status: "INACTIVE", updatedAt: sql`now()` })
    .where(and(notInArray(accounts.id, activeIds), eq(accounts.status, "ACTIVE")));
}
