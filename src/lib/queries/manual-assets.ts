import { db } from "@/lib/db";
import { manualAssets, manualAssetSnapshots } from "@/lib/db/schema";
import { eq, asc, gte, sql } from "drizzle-orm";
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
  const [row] = await db
    .update(manualAssets)
    .set({ name, value, notes: notes ?? null, emoji: emoji ?? null, updatedAt: new Date() })
    .where(eq(manualAssets.id, id))
    .returning();
  return row ?? null;
}

export async function deleteManualAsset(id: number): Promise<void> {
  await db.delete(manualAssets).where(eq(manualAssets.id, id));
}

export async function addManualAssetSnapshot(
  id: number,
  value: string,
  snapshotDate: string
): Promise<void> {
  await db
    .insert(manualAssetSnapshots)
    .values({ manualAssetId: id, value, snapshotDate })
    .onConflictDoUpdate({
      target: [manualAssetSnapshots.manualAssetId, manualAssetSnapshots.snapshotDate],
      set: { value },
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
