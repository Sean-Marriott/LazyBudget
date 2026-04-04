import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowSankey } from "@/components/cashflow/CashflowSankey";
import { MonthSelector } from "@/components/cashflow/MonthSelector";
import { SpendingPieChart } from "@/components/charts/SpendingPieChart";
import { getMonthSummary, getMonthlySpendingByCategory } from "@/lib/queries/transactions";
import { parse, startOfMonth, isValid } from "date-fns";

interface SearchParams {
  month?: string;
}

/**
 * Render the Cashflow page for a specific month.
 *
 * The component reads an optional `month` query parameter (format "yyyy-MM") from
 * `searchParams`; when present it selects that month (normalized to the month's
 * start), otherwise it uses the current month. It fetches the month's income
 * summary and spending-by-category data and renders the page UI.
 *
 * @param searchParams - A promise resolving to query parameters; may include `month` in "yyyy-MM" format
 * @returns The rendered React element for the cashflow view, including a month selector and a Sankey visualization of income and spending
 */
export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { month: monthParam } = await searchParams;

  const parsedMonth = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : new Date();
  const month = startOfMonth(isValid(parsedMonth) ? parsedMonth : new Date());
  
  const [{ income }, spending] = await Promise.all([
    getMonthSummary(month),
    getMonthlySpendingByCategory(month),
  ]);

  return (
    <>
      <TopBar title="Cashflow" />
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <MonthSelector month={month} />
          </CardHeader>
          <CardContent className="pt-0">
            <CashflowSankey income={income} spending={spending} height={480} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spending breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SpendingPieChart spending={spending} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
