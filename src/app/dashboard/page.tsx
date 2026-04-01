import { TopBar } from "@/components/layout/TopBar";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { MonthSummaryCard } from "@/components/dashboard/MonthSummaryCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { AccountsSummary } from "@/components/dashboard/AccountsSummary";
import { CashflowCard } from "@/components/dashboard/CashflowCard";
import { getAllAccounts, getNetWorthSummary } from "@/lib/queries/accounts";
import { getRecentTransactions, getMonthSummary } from "@/lib/queries/transactions";

/**
 * Render the dashboard page, fetching summary data and showing error, empty, or populated states.
 *
 * Fetches net worth, accounts, recent transactions, and the current month summary; then renders
 * a top bar and main content that conditionally shows a database error banner, a welcome prompt
 * when there is no data, or the full dashboard grid (net worth, month summary, accounts,
 * recent transactions, and cashflow).
 *
 * @returns The rendered dashboard page JSX element
 */
export default async function DashboardPage() {
  let netWorth = { assets: 0, liabilities: 0, netWorth: 0 };
  let accounts: Awaited<ReturnType<typeof getAllAccounts>> = [];
  let recentTx: Awaited<ReturnType<typeof getRecentTransactions>> = [];
  let monthSummary = { income: 0, expenses: 0, net: 0 };
  let dbError = false;

  try {
    [netWorth, accounts, recentTx, monthSummary] = await Promise.all([
      getNetWorthSummary(),
      getAllAccounts(),
      getRecentTransactions(15),
      getMonthSummary(new Date()),
    ]);
  } catch {
    dbError = true;
  }

  const hasData = accounts.length > 0 || recentTx.length > 0;

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {dbError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <strong>Database not available.</strong> Start Docker Desktop and run{" "}
            <code className="font-mono">npm run db:push</code> to initialise the database, then add your Akahu tokens to{" "}
            <code className="font-mono">.env.local</code>.
          </div>
        )}

        {!dbError && !hasData && (
          <div className="rounded-lg border border-dashed p-10 text-center space-y-2">
            <p className="font-medium">Welcome to LazyBudget!</p>
            <p className="text-sm text-muted-foreground">
              Click <strong>Sync</strong> in the top right to pull your accounts and transactions from Akahu.
            </p>
          </div>
        )}

        {!dbError && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Net worth — full width */}
            <NetWorthCard
              assets={netWorth.assets}
              liabilities={netWorth.liabilities}
              netWorth={netWorth.netWorth}
            />

            {/* Month summary */}
            <MonthSummaryCard
              month={new Date()}
              income={monthSummary.income}
              expenses={monthSummary.expenses}
              net={monthSummary.net}
            />

            {/* Accounts summary */}
            <AccountsSummary accounts={accounts} />

            {/* Recent transactions — spans 2 cols on large screens */}
            <RecentTransactions transactions={recentTx} />

            {/* Cashflow Sankey — full width */}
            <CashflowCard />
          </div>
        )}
      </main>
    </>
  );
}
