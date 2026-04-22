import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NetWorthTrendChart } from "@/components/insights/NetWorthTrendChart";
import { MonthlyTrendsChart } from "@/components/insights/MonthlyTrendsChart";
import { MiniAccountList } from "@/components/dashboard/MiniAccountList";
import { getNetWorthHistory, getMonthlyTrends, getAccountBalanceHistories } from "@/lib/queries/insights";

const MAX_ACCOUNTS = 6;

export async function InsightsPreviewCard() {
  let netWorthHistory: Awaited<ReturnType<typeof getNetWorthHistory>> = [];
  let monthlyTrends: Awaited<ReturnType<typeof getMonthlyTrends>> = [];
  let allAccounts: Awaited<ReturnType<typeof getAccountBalanceHistories>> = [];

  try {
    [netWorthHistory, monthlyTrends, allAccounts] = await Promise.all([
      getNetWorthHistory(90),
      getMonthlyTrends(6),
      getAccountBalanceHistories(90),
    ]);
  } catch {
    return null;
  }

  const hasAnyData = netWorthHistory.length > 0 || monthlyTrends.length > 0;
  if (!hasAnyData) return null;

  const topAccounts = allAccounts
    .filter((a) => a.group !== "excluded" as string)
    .sort((a, b) => Math.abs(b.currentValue) - Math.abs(a.currentValue))
    .slice(0, MAX_ACCOUNTS);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">Insights</p>
          <Link
            href="/insights"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Net Worth — 90 days</p>
            <NetWorthTrendChart data={netWorthHistory} height={160} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Income & Spending — 6 months</p>
            <MonthlyTrendsChart data={monthlyTrends} height={160} />
          </div>
          {topAccounts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">Top Accounts</p>
              <MiniAccountList accounts={topAccounts} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
