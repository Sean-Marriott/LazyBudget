import { db } from "@/lib/db";
import { manualAccounts, manualAccountSnapshots } from "@/lib/db/schema";
import { and, eq, asc, gte, max, sql } from "drizzle-orm";
import { getAccountGroup } from "@/lib/utils/accounts";
import { toNumber } from "@/lib/utils/currency";
import type { AccountGroup } from "@/lib/utils/accounts";

export type ManualAccount = typeof manualAccounts.$inferSelect;
export type ManualAccountWithGroup = ManualAccount & { group: AccountGroup };

export async function getAllManualAccounts(
  userId: string
): Promise<ManualAccountWithGroup[]> {
  const rows = await db
    .select()
    .from(manualAccounts)
    .where(eq(manualAccounts.userId, userId))
    .orderBy(asc(manualAccounts.name));
  return rows.map((r) => ({ ...r, group: getAccountGroup(r.type) }));
}

export async function createManualAccount(
  userId: string,
  name: string,
  type: string,
  balance: string,
  notes?: string
): Promise<ManualAccount> {
  const [row] = await db
    .insert(manualAccounts)
    .values({ userId, name, type, balance, notes: notes ?? null })
    .returning();
  return row;
}

export async function updateManualAccount(
  userId: string,
  id: number,
  name: string,
  type: string,
  balance: string,
  notes?: string
): Promise<ManualAccount | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(manualAccounts)
      .set({ name, type, balance, notes: notes ?? null, updatedAt: new Date() })
      .where(and(eq(manualAccounts.userId, userId), eq(manualAccounts.id, id)))
      .returning();

    if (!row) return null;

    const [{ latestDate }] = await tx
      .select({ latestDate: max(manualAccountSnapshots.snapshotDate) })
      .from(manualAccountSnapshots)
      .where(eq(manualAccountSnapshots.manualAccountId, id));

    if (latestDate) {
      await tx
        .update(manualAccountSnapshots)
        .set({ balance })
        .where(
          and(
            eq(manualAccountSnapshots.manualAccountId, id),
            eq(manualAccountSnapshots.snapshotDate, latestDate)
          )
        );
    }

    return row;
  });
}

export async function deleteManualAccount(
  userId: string,
  id: number
): Promise<boolean> {
  const deleted = await db
    .delete(manualAccounts)
    .where(and(eq(manualAccounts.userId, userId), eq(manualAccounts.id, id)))
    .returning({ id: manualAccounts.id });
  return deleted.length > 0;
}

export async function addManualAccountSnapshot(
  userId: string,
  id: number,
  balance: string,
  snapshotDate: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: manualAccounts.id })
      .from(manualAccounts)
      .where(and(eq(manualAccounts.userId, userId), eq(manualAccounts.id, id)));
    if (!owned) return false;

    await tx
      .insert(manualAccountSnapshots)
      .values({ manualAccountId: id, balance, snapshotDate })
      .onConflictDoUpdate({
        target: [manualAccountSnapshots.manualAccountId, manualAccountSnapshots.snapshotDate],
        set: { balance },
      });

    const [{ latestDate }] = await tx
      .select({ latestDate: max(manualAccountSnapshots.snapshotDate) })
      .from(manualAccountSnapshots)
      .where(eq(manualAccountSnapshots.manualAccountId, id));

    if (!latestDate || snapshotDate >= latestDate) {
      await tx
        .update(manualAccounts)
        .set({ balance, updatedAt: new Date() })
        .where(eq(manualAccounts.id, id));
    }

    return true;
  });
}

export async function getManualAccountSnapshots(
  userId: string,
  id: number,
  days: number
): Promise<Array<{ date: string; balance: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db
    .select({
      date: manualAccountSnapshots.snapshotDate,
      balance: manualAccountSnapshots.balance,
    })
    .from(manualAccountSnapshots)
    .innerJoin(
      manualAccounts,
      eq(manualAccountSnapshots.manualAccountId, manualAccounts.id)
    )
    .where(
      sql`${manualAccounts.userId} = ${userId} AND ${manualAccountSnapshots.manualAccountId} = ${id} AND ${manualAccountSnapshots.snapshotDate} >= ${cutoff.toISOString().slice(0, 10)}`
    )
    .orderBy(asc(manualAccountSnapshots.snapshotDate));
  return rows.map((r) => ({ date: r.date, balance: toNumber(r.balance) }));
}

export async function getLatestManualAccountSnapshotDates(
  userId: string
): Promise<Record<number, string>> {
  const rows = await db
    .select({
      manualAccountId: manualAccountSnapshots.manualAccountId,
      latestDate: max(manualAccountSnapshots.snapshotDate),
    })
    .from(manualAccountSnapshots)
    .innerJoin(
      manualAccounts,
      eq(manualAccountSnapshots.manualAccountId, manualAccounts.id)
    )
    .where(eq(manualAccounts.userId, userId))
    .groupBy(manualAccountSnapshots.manualAccountId);
  return Object.fromEntries(
    rows.filter((r) => r.latestDate).map((r) => [r.manualAccountId, r.latestDate!])
  );
}

export async function getAllManualAccountSnapshotsSince(
  userId: string,
  days: number
): Promise<Array<{ manualAccountId: number; date: string; balance: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db
    .select({
      manualAccountId: manualAccountSnapshots.manualAccountId,
      date: manualAccountSnapshots.snapshotDate,
      balance: manualAccountSnapshots.balance,
    })
    .from(manualAccountSnapshots)
    .innerJoin(
      manualAccounts,
      eq(manualAccountSnapshots.manualAccountId, manualAccounts.id)
    )
    .where(
      and(
        eq(manualAccounts.userId, userId),
        gte(manualAccountSnapshots.snapshotDate, cutoff.toISOString().slice(0, 10))
      )
    )
    .orderBy(asc(manualAccountSnapshots.snapshotDate));
  return rows.map((r) => ({
    manualAccountId: r.manualAccountId,
    date: r.date,
    balance: toNumber(r.balance),
  }));
}
