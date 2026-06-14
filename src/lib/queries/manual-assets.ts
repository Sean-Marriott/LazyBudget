import { db } from "@/lib/db";
import { manualAssets, manualAssetSnapshots } from "@/lib/db/schema";
import { and, eq, asc, gte, max, sql } from "drizzle-orm";
import { toNumber } from "@/lib/utils/currency";

export type ManualAsset = typeof manualAssets.$inferSelect;

export async function getAllManualAssets(userId: string): Promise<ManualAsset[]> {
  return db
    .select()
    .from(manualAssets)
    .where(eq(manualAssets.userId, userId))
    .orderBy(asc(manualAssets.name));
}

export async function createManualAsset(
  userId: string,
  name: string,
  value: string,
  notes?: string,
  emoji?: string
): Promise<ManualAsset> {
  const [row] = await db
    .insert(manualAssets)
    .values({ userId, name, value, notes: notes ?? null, emoji: emoji ?? null })
    .returning();
  return row;
}

export async function updateManualAsset(
  userId: string,
  id: number,
  name: string,
  value: string,
  notes?: string,
  emoji?: string
): Promise<ManualAsset | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(manualAssets)
      .set({ name, value, notes: notes ?? null, emoji: emoji ?? null, updatedAt: new Date() })
      .where(and(eq(manualAssets.userId, userId), eq(manualAssets.id, id)))
      .returning();

    if (!row) return null;

    const [{ latestDate }] = await tx
      .select({ latestDate: max(manualAssetSnapshots.snapshotDate) })
      .from(manualAssetSnapshots)
      .where(eq(manualAssetSnapshots.manualAssetId, id));

    if (latestDate) {
      await tx
        .update(manualAssetSnapshots)
        .set({ value })
        .where(
          and(
            eq(manualAssetSnapshots.manualAssetId, id),
            eq(manualAssetSnapshots.snapshotDate, latestDate)
          )
        );
    }

    return row;
  });
}

export async function deleteManualAsset(userId: string, id: number): Promise<boolean> {
  const deleted = await db
    .delete(manualAssets)
    .where(and(eq(manualAssets.userId, userId), eq(manualAssets.id, id)))
    .returning({ id: manualAssets.id });
  return deleted.length > 0;
}

export async function addManualAssetSnapshot(
  userId: string,
  id: number,
  value: string,
  snapshotDate: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: manualAssets.id })
      .from(manualAssets)
      .where(and(eq(manualAssets.userId, userId), eq(manualAssets.id, id)));
    if (!owned) return false;

    await tx
      .insert(manualAssetSnapshots)
      .values({ manualAssetId: id, value, snapshotDate })
      .onConflictDoUpdate({
        target: [manualAssetSnapshots.manualAssetId, manualAssetSnapshots.snapshotDate],
        set: { value },
      });

    const [{ latestDate }] = await tx
      .select({ latestDate: max(manualAssetSnapshots.snapshotDate) })
      .from(manualAssetSnapshots)
      .where(eq(manualAssetSnapshots.manualAssetId, id));

    if (!latestDate || snapshotDate >= latestDate) {
      await tx
        .update(manualAssets)
        .set({ value, updatedAt: new Date() })
        .where(eq(manualAssets.id, id));
    }

    return true;
  });
}

export async function getManualAssetSnapshots(
  userId: string,
  id: number,
  days: number
): Promise<Array<{ date: string; value: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db
    .select({
      date: manualAssetSnapshots.snapshotDate,
      value: manualAssetSnapshots.value,
    })
    .from(manualAssetSnapshots)
    .innerJoin(
      manualAssets,
      eq(manualAssetSnapshots.manualAssetId, manualAssets.id)
    )
    .where(
      sql`${manualAssets.userId} = ${userId} AND ${manualAssetSnapshots.manualAssetId} = ${id} AND ${manualAssetSnapshots.snapshotDate} >= ${cutoff.toISOString().slice(0, 10)}`
    )
    .orderBy(asc(manualAssetSnapshots.snapshotDate));
  return rows.map((r) => ({ date: r.date, value: toNumber(r.value) }));
}

export async function getLatestManualAssetSnapshotDates(
  userId: string
): Promise<Record<number, string>> {
  const rows = await db
    .select({
      manualAssetId: manualAssetSnapshots.manualAssetId,
      latestDate: max(manualAssetSnapshots.snapshotDate),
    })
    .from(manualAssetSnapshots)
    .innerJoin(
      manualAssets,
      eq(manualAssetSnapshots.manualAssetId, manualAssets.id)
    )
    .where(eq(manualAssets.userId, userId))
    .groupBy(manualAssetSnapshots.manualAssetId);
  return Object.fromEntries(
    rows.filter((r) => r.latestDate).map((r) => [r.manualAssetId, r.latestDate!])
  );
}

export async function getAllManualAssetSnapshotsSince(
  userId: string,
  days: number
): Promise<Array<{ manualAssetId: number; date: string; value: number }>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db
    .select({
      manualAssetId: manualAssetSnapshots.manualAssetId,
      date: manualAssetSnapshots.snapshotDate,
      value: manualAssetSnapshots.value,
    })
    .from(manualAssetSnapshots)
    .innerJoin(
      manualAssets,
      eq(manualAssetSnapshots.manualAssetId, manualAssets.id)
    )
    .where(
      and(
        eq(manualAssets.userId, userId),
        gte(manualAssetSnapshots.snapshotDate, cutoff.toISOString().slice(0, 10))
      )
    )
    .orderBy(asc(manualAssetSnapshots.snapshotDate));
  return rows.map((r) => ({
    manualAssetId: r.manualAssetId,
    date: r.date,
    value: toNumber(r.value),
  }));
}
