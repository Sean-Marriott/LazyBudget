import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MonthSelector } from "@/components/cashflow/MonthSelector";
import { BudgetSection } from "@/components/budget/BudgetSection";
import { BudgetSummary } from "@/components/budget/BudgetSummary";
import type { BudgetLine } from "@/components/budget/BudgetDialog";
import { requireUser } from "@/lib/session";
import {
  getBudgetsForMonth,
  getLatestBudgetMonthBefore,
} from "@/lib/queries/budgets";
import { getMonthlySpendingByCategory } from "@/lib/queries/transactions";
import { getAllCategories } from "@/lib/queries/categories";
import { getCategoryColor } from "@/lib/utils/categories";
import { toNumber } from "@/lib/utils/currency";
import { format, parse, startOfMonth, isValid } from "date-fns";

export const dynamic = "force-dynamic";

interface SearchParams {
  month?: string;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;

  const parsedMonth = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : new Date();
  const month = startOfMonth(isValid(parsedMonth) ? parsedMonth : new Date());
  const monthKey = format(month, "yyyy-MM-01");

  let lines: BudgetLine[] = [];
  let unbudgeted: Array<{ category: string; total: number }> = [];
  let copySourceMonth: string | null = null;
  let customCategoryNames: string[] = [];
  let totals = { budgeted: 0, spent: 0, remaining: 0 };
  let dbError = false;

  try {
    const [budgets, spending, customCats] = await Promise.all([
      getBudgetsForMonth(user.id, monthKey),
      getMonthlySpendingByCategory(user.id, month),
      getAllCategories(user.id),
    ]);

    const customColorMap = Object.fromEntries(
      customCats.map((c) => [c.name, c.color])
    );
    customCategoryNames = customCats.map((c) => c.name);
    const spentByCategory = Object.fromEntries(
      spending.map((s) => [s.category, s.total])
    );

    lines = budgets.map((b) => ({
      id: b.id,
      category: b.category,
      amount: toNumber(b.amount),
      notes: b.notes,
      spent: spentByCategory[b.category] ?? 0,
      color: getCategoryColor(b.category, customColorMap),
    }));

    const budgetedNames = new Set(lines.map((l) => l.category));
    unbudgeted = spending.filter((s) => !budgetedNames.has(s.category));

    const budgeted = lines.reduce((sum, l) => sum + l.amount, 0);
    const spent = lines.reduce((sum, l) => sum + l.spent, 0);
    totals = { budgeted, spent, remaining: budgeted - spent };

    if (budgets.length === 0) {
      copySourceMonth = await getLatestBudgetMonthBefore(user.id, monthKey);
    }
  } catch {
    dbError = true;
  }

  return (
    <>
      <TopBar title="Budget" />
      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {dbError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            <strong>Database not available.</strong> Start Docker and run{" "}
            <code>npm run db:push</code> to initialise the database.
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <MonthSelector month={month} basePath="/budget" />
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {lines.length > 0 && (
                <BudgetSummary
                  budgeted={totals.budgeted}
                  spent={totals.spent}
                  remaining={totals.remaining}
                />
              )}
              <BudgetSection
                month={format(month, "yyyy-MM")}
                lines={lines}
                copySourceMonth={copySourceMonth}
                customCategoryNames={customCategoryNames}
                unbudgeted={unbudgeted}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
