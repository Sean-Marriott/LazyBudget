import { db } from "@/lib/db";
import { manualAssets, manualAssetSnapshots } from "@/lib/db/schema";
import { and, eq, asc, gte, max, sql } from "drizzle-orm";
import { toNumber } from "@/lib/utils/currency";

export type ManualAsset = typeof manualAssets.$inferSelect;

export async function getAllManualAssets(): Promise<ManualAsset[]> {
  return db.select().from(manualAssets).orderBy(asc(manualAssets.name));
}

export async function createManualAsset(
  name: string,
  value: string,
  notes?: string,
  emoji?: string
): Promise<ManualAsset> {
  const [row] = await db
    .insert(manualAssets)
    .values({ name, value, notes: notes ?? null, emoji: emoji ?? null })
    .returning();
  return row;
}

export async function updateManualAsset(
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
      .where(eq(manualAssets.id, id))
      .returning();

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

    return row ?? null;
  });
}

export async function deleteManualAsset(id: number): Promise<void> {
  await db.delete(manualAssets).where(eq(manualAssets.id, id));
}

export async function addManualAssetSnapshot(
  id: number,
  value: string,
  snapshotDate: string
): Promise<void> {
  await db.transaction(async (tx) => {
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
  });
}

export async function getManualAssetSnapshots(
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
    .where(
      sql`${manualAssetSnapshots.manualAssetId} = ${id} AND ${manualAssetSnapshots.snapshotDate} >= ${cutoff.toISOString().slice(0, 10)}`
    )
    .orderBy(asc(manualAssetSnapshots.snapshotDate));
  return rows.map((r) => ({ date: r.date, value: toNumber(r.value) }));
}

export async function getLatestManualAssetSnapshotDates(): Promise<Record<number, string>> {
  const rows = await db
    .select({
      manualAssetId: manualAssetSnapshots.manualAssetId,
      latestDate: max(manualAssetSnapshots.snapshotDate),
    })
    .from(manualAssetSnapshots)
    .groupBy(manualAssetSnapshots.manualAssetId);
  return Object.fromEntries(
    rows.filter((r) => r.latestDate).map((r) => [r.manualAssetId, r.latestDate!])
  );
}

export async function getAllManualAssetSnapshotsSince(
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
    .where(gte(manualAssetSnapshots.snapshotDate, cutoff.toISOString().slice(0, 10)))
    .orderBy(asc(manualAssetSnapshots.snapshotDate));
  return rows.map((r) => ({ ...r, value: toNumber(r.value) }));
}
