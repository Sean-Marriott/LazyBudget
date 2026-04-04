import { db } from "@/lib/db";
import { manualAccounts } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAccountGroup } from "@/lib/utils/accounts";
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
  const [row] = await db
    .update(manualAccounts)
    .set({ name, type, balance, notes: notes ?? null, updatedAt: new Date() })
    .where(eq(manualAccounts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteManualAccount(id: number): Promise<void> {
  await db.delete(manualAccounts).where(eq(manualAccounts.id, id));
}
