import { db } from "@/lib/db";
import { manualAccounts, manualAccountSnapshots } from "@/lib/db/schema";
import { and, eq, asc, gte, max, sql } from "drizzle-orm";
import { getAccountGroup } from "@/lib/utils/accounts";
import { toNumber } from "@/lib/utils/currency";
import type { AccountGroup } from "@/lib/utils/accounts";

export type ManualAccount = typeof manualAccounts.$inferSelect;
export type ManualAccountWithGroup = ManualAccount & { group: AccountGroup };

export async function getAllManualAccounts(): Promise<ManualAccountWithGroup[]> {
  const rows = await db.select().from(manualAccounts).orderBy(asc(manualAccounts.name));
  return rows.map((r) => ({ ...r, group: getAccountGroup(r.type) }));
}

export async function createManualAccount(
  name: string,
  type: string,
  balance: string,
  notes?: string
): Promise<ManualAccount> {
  const [row] = await db
    .insert(manualAccounts)
    .values({ name, type, balance, notes: notes ?? null })
    .returning();
  return row;
}

export async function updateManualAccount(
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
      .where(eq(manualAccounts.id, id))
      .returning();

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

    return row ?? null;
  });
}

export async function deleteManualAccount(id: number): Promise<void> {
  await db.delete(manualAccounts).where(eq(manualAccounts.id, id));
}

export async function addManualAccountSnapshot(
  id: number,
  balance: string,
  snapshotDate: string
): Promise<void> {
  await db.transaction(async (tx) => {
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
  });
}

export async function getManualAccountSnapshots(
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
    .where(
      sql`${manualAccountSnapshots.manualAccountId} = ${id} AND ${manualAccountSnapshots.snapshotDate} >= ${cutoff.toISOString().slice(0, 10)}`
    )
    .orderBy(asc(manualAccountSnapshots.snapshotDate));
  return rows.map((r) => ({ date: r.date, balance: toNumber(r.balance) }));
}

export async function getLatestManualAccountSnapshotDates(): Promise<Record<number, string>> {
  const rows = await db
    .select({
      manualAccountId: manualAccountSnapshots.manualAccountId,
      latestDate: max(manualAccountSnapshots.snapshotDate),
    })
    .from(manualAccountSnapshots)
    .groupBy(manualAccountSnapshots.manualAccountId);
  return Object.fromEntries(
    rows.filter((r) => r.latestDate).map((r) => [r.manualAccountId, r.latestDate!])
  );
}

export async function getAllManualAccountSnapshotsSince(
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
    .where(gte(manualAccountSnapshots.snapshotDate, cutoff.toISOString().slice(0, 10)))
    .orderBy(asc(manualAccountSnapshots.snapshotDate));
  return rows.map((r) => ({ ...r, balance: toNumber(r.balance) }));
}
