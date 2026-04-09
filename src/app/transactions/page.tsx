import { TopBar } from "@/components/layout/TopBar";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { getTransactions } from "@/lib/queries/transactions";
import { parse, startOfMonth, endOfMonth, isValid } from "date-fns";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface SearchParams {
  month?: string;
  category?: string;
  search?: string;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { month: monthParam, category, search } = await searchParams;

  const parsedMonth = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : new Date();
  const month = startOfMonth(isValid(parsedMonth) ? parsedMonth : new Date());

  let txList: Awaited<ReturnType<typeof getTransactions>> = [];
  let dbError = false;

  try {
    txList = await getTransactions({
      monthStart: startOfMonth(month),
      monthEnd: endOfMonth(month),
      category: category || undefined,
      search: search || undefined,
    });
  } catch {
    dbError = true;
  }

  return (
    <>
      <TopBar title="Transactions" />
      <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-4">
        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Database not available.</strong> Start Docker and run{" "}
            <code>npm run db:push</code> to initialise the database.
          </div>
        )}

        <Suspense>
          <TransactionFilters month={month} category={category} search={search} />
        </Suspense>

        {!dbError && <TransactionTable transactions={txList} />}
      </main>
    </>
  );
}
