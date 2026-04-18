import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export type Category = typeof categories.$inferSelect;

export interface CategoryInput {
  name: string;
  color: string;
  emoji?: string | null;
}

export async function getAllCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  return row ?? null;
}

export async function createCategory(data: CategoryInput): Promise<Category> {
  const [row] = await db.insert(categories).values(data).returning();
  return row;
}

export async function updateCategory(
  id: number,
  data: Partial<CategoryInput>
): Promise<Category | null> {
  const [row] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCategory(id: number): Promise<void> {
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (cat) {
    await db
      .update(transactions)
      .set({ userCategory: null })
      .where(eq(transactions.userCategory, cat.name));
  }
  await db.delete(categories).where(eq(categories.id, id));
}
