import { db } from "@/lib/db";
import { manualAssets } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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
