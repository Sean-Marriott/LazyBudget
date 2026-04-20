import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { RangeSelector } from "@/components/insights/RangeSelector";
import { NetWorthTrendChart } from "@/components/insights/NetWorthTrendChart";
import { AccountBalanceCard } from "@/components/insights/AccountBalanceCard";
import { MonthlyTrendsChart } from "@/components/insights/MonthlyTrendsChart";
import { CategoryTrendsChart } from "@/components/insights/CategoryTrendsChart";
import {
  getNetWorthHistory,
  getAccountBalanceHistories,
  getMonthlyTrends,
  getMonthlyCategoryTrends,
} from "@/lib/queries/insights";
import { getAllCategories } from "@/lib/queries/categories";
import type { Range } from "@/components/insights/RangeSelector";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<Range, number> = {
  "3m": 90,
  "6m": 180,
  "1y": 365,
  all: 3650,
};

const RANGE_MONTHS: Record<Range, number> = {
  "3m": 3,
  "6m": 6,
  "1y": 12,
  all: 60,
};

function parseRange(raw: string | undefined): Range {
  if (raw === "3m" || raw === "6m" || raw === "1y" || raw === "all") return raw;
  return "1y";
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const days = RANGE_DAYS[range];
  const months = RANGE_MONTHS[range];

  let netWorthHistory: Awaited<ReturnType<typeof getNetWorthHistory>> = [];
  let accountHistories: Awaited<ReturnType<typeof getAccountBalanceHistories>> = [];
  let monthlyTrends: Awaited<ReturnType<typeof getMonthlyTrends>> = [];
  let categoryTrends: Awaited<ReturnType<typeof getMonthlyCategoryTrends>> = {
    categories: [],
    data: [],
  };
  let customCats: Awaited<ReturnType<typeof getAllCategories>> = [];
  let dbError = false;

  try {
    [netWorthHistory, accountHistories, monthlyTrends, categoryTrends, customCats] =
      await Promise.all([
        getNetWorthHistory(days),
        getAccountBalanceHistories(days),
        getMonthlyTrends(months),
        getMonthlyCategoryTrends(months),
        getAllCategories(),
      ]);
  } catch {
    dbError = true;
  }

  const customColorMap = Object.fromEntries(customCats.map((c) => [c.name, c.color]));

  return (
    <>
      <TopBar title="Insights" />
      <main className="flex-1 overflow-auto p-3 sm:p-6 space-y-6">
        <Suspense>
          <RangeSelector value={range} />
        </Suspense>

        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Database not available.</strong> Start Docker and run{" "}
            <code>npm run db:push</code> to initialise the database.
          </div>
        )}

        {!dbError && (
          <>
            {/* Net Worth Over Time */}
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Net Worth Over Time</h2>
                <p className="text-xs text-muted-foreground">
                  Connected accounts + manual entries with recorded history
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <NetWorthTrendChart data={netWorthHistory} />
              </div>
            </section>

            {/* Account Balances */}
            {accountHistories.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Account Balances</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {accountHistories.map((account) => (
                    <AccountBalanceCard key={account.id} account={account} />
                  ))}
                </div>
              </section>
            )}

            {/* Monthly Income & Spending */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Monthly Income & Spending</h2>
              <div className="rounded-lg border p-4">
                <MonthlyTrendsChart data={monthlyTrends} />
              </div>
            </section>

            {/* Category Spending Trends */}
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">Category Spending Trends</h2>
                <p className="text-xs text-muted-foreground">Top 5 categories by total spend</p>
              </div>
              <div className="rounded-lg border p-4">
                <CategoryTrendsChart
                  categories={categoryTrends.categories}
                  data={categoryTrends.data}
                  customColorMap={customColorMap}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
