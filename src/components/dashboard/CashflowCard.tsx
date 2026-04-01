import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowSankey } from "@/components/cashflow/CashflowSankey";
import { getMonthSummary, getMonthlySpendingByCategory } from "@/lib/queries/transactions";
import { formatMonthLabel } from "@/lib/utils/dates";

/**
 * Render a cashflow card for the current month.
 *
 * Fetches the current month's income summary and spending-by-category data, then
 * renders a Card containing a header with the formatted month and a
 * CashflowSankey visualization configured with the fetched `income` and `spending`.
 *
 * @returns A React element: a Card with a month-labeled header and a CashflowSankey chart showing the current month's income and spending.
 */
export async function CashflowCard() {
  const now = new Date();
  const [{ income }, spending] = await Promise.all([
    getMonthSummary(now),
    getMonthlySpendingByCategory(now),
  ]);

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cashflow — {formatMonthLabel(now)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CashflowSankey income={income} spending={spending} height={220} compact />
      </CardContent>
    </Card>
  );
}
