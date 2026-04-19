import { TopBar } from "@/components/layout/TopBar";
import { CategoriesSection } from "@/components/categories/CategoriesSection";
import { getAllCategories, getTransactionCountsByCategory } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  let cats: Awaited<ReturnType<typeof getAllCategories>> = [];
  let transactionCounts: Record<number, number> = {};
  let dbError = false;

  try {
    const [fetchedCats, countsByName] = await Promise.all([
      getAllCategories(),
      getTransactionCountsByCategory(),
    ]);
    cats = fetchedCats;
    transactionCounts = Object.fromEntries(
      cats.map((c) => [c.id, countsByName[c.name] ?? 0])
    );
  } catch {
    dbError = true;
  }

  return (
    <>
      <TopBar title="Categories" />
      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            <strong>Database not available.</strong> Start Docker and run{" "}
            <code>npm run db:push</code> to initialise the database.
          </div>
        )}
        {!dbError && (
          <CategoriesSection categories={cats} transactionCounts={transactionCounts} />
        )}
      </main>
    </>
  );
}
