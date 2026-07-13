import { db } from "@/lib/db";
import type { DB } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { eq, and, asc, lt, inArray, sql } from "drizzle-orm";

/** Accepts either the top-level `db` or a `tx` inside `db.transaction(...)`. */
type DbClient = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

export type Budget = typeof budgets.$inferSelect;

export interface BudgetInput {
  month: string; // first day of month: "yyyy-MM-01"
  category: string;
  amount: string; // numeric column — pass as string
  notes?: string | null;
}

export async function getBudgetsForMonth(
  userId: string,
  month: string
): Promise<Budget[]> {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)))
    .orderBy(asc(budgets.category));
}

export async function getBudgetById(
  userId: string,
  id: number
): Promise<Budget | null> {
  const [row] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
  return row ?? null;
}

export async function createBudget(
  userId: string,
  data: BudgetInput
): Promise<Budget> {
  const [row] = await db
    .insert(budgets)
    .values({ ...data, budgetType: "SPEND", userId })
    .returning();
  return row;
}

export async function updateBudget(
  userId: string,
  id: number,
  data: Partial<Pick<BudgetInput, "category" | "amount" | "notes">>
): Promise<Budget | null> {
  const [row] = await db
    .update(budgets)
    .set(data)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteBudget(userId: string, id: number): Promise<void> {
  await db
    .delete(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
}

/** Most recent month before `month` that has at least one budget line, or null. */
export async function getLatestBudgetMonthBefore(
  userId: string,
  month: string
): Promise<string | null> {
  const [row] = await db
    .select({ month: sql<string | null>`max(${budgets.month})` })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), lt(budgets.month, month)));
  return row?.month ?? null;
}

/**
 * Copy all budget lines from one month to another. Categories that already
 * have a line in the target month are skipped (unique index on
 * userId/month/category), making the copy idempotent.
 * Returns the rows actually inserted.
 */
export async function copyBudgetsFromMonth(
  userId: string,
  fromMonth: string,
  toMonth: string
): Promise<Budget[]> {
  const source = await getBudgetsForMonth(userId, fromMonth);
  if (source.length === 0) return [];

  return db
    .insert(budgets)
    .values(
      source.map((b) => ({
        userId,
        month: toMonth,
        category: b.category,
        budgetType: b.budgetType,
        amount: b.amount,
        notes: b.notes,
      }))
    )
    .onConflictDoNothing({
      target: [budgets.userId, budgets.month, budgets.category],
    })
    .returning();
}

/**
 * Rename `oldName` to `newName` on every budget line for `userId`, mirroring
 * the same rename cascade applied to `transactions.userCategory`. `category`
 * is a free-text column (not an FK to `categories`), so nothing else keeps
 * this in sync — skipping this cascade leaves budget lines permanently
 * pointed at a name no transaction (and no category picker) has anymore.
 *
 * Since `(userId, month, category)` is unique, a plain bulk UPDATE would
 * abort if `newName` already has a line in the same month as a stale
 * `oldName` line. For those months, the pre-existing `newName` line is kept
 * and the stale `oldName` line is dropped instead of renamed.
 *
 * Pass the `tx` from an enclosing `db.transaction(...)` so this commits
 * atomically with the category rename itself.
 */
export async function cascadeCategoryRename(
  dbClient: DbClient,
  userId: string,
  oldName: string,
  newName: string
): Promise<void> {
  const stale = await dbClient
    .select({ id: budgets.id, month: budgets.month })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.category, oldName)));
  if (stale.length === 0) return;

  const staleMonths = stale.map((b) => b.month);
  const conflicts = await dbClient
    .select({ month: budgets.month })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.category, newName),
        inArray(budgets.month, staleMonths)
      )
    );
  const conflictMonths = new Set(conflicts.map((c) => c.month));

  const conflictingIds = stale
    .filter((b) => conflictMonths.has(b.month))
    .map((b) => b.id);
  const renameableIds = stale
    .filter((b) => !conflictMonths.has(b.month))
    .map((b) => b.id);

  if (conflictingIds.length > 0) {
    await dbClient
      .delete(budgets)
      .where(and(eq(budgets.userId, userId), inArray(budgets.id, conflictingIds)));
  }
  if (renameableIds.length > 0) {
    await dbClient
      .update(budgets)
      .set({ category: newName })
      .where(and(eq(budgets.userId, userId), inArray(budgets.id, renameableIds)));
  }
}

/**
 * Delete every budget line for `userId` under `categoryName`. Called when a
 * category is deleted — its transactions get `userCategory` nulled back to
 * "Uncategorised", so a budget line still pinned to the deleted name would
 * never match any spend again and become unselectable in the UI (the name
 * no longer appears in any category picker).
 *
 * Pass the `tx` from an enclosing `db.transaction(...)` so this commits
 * atomically with the category delete itself.
 */
export async function deleteBudgetsForCategory(
  dbClient: DbClient,
  userId: string,
  categoryName: string
): Promise<void> {
  await dbClient
    .delete(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.category, categoryName)));
}
