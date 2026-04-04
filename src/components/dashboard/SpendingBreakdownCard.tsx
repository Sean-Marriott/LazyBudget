import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpendingPieChart } from "@/components/charts/SpendingPieChart";
import { getMonthlySpendingByCategory } from "@/lib/queries/transactions";

export async function SpendingBreakdownCard() {
  try {
    const spending = await getMonthlySpendingByCategory(new Date());
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Spending this month
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SpendingPieChart spending={spending} />
        </CardContent>
      </Card>
    );
  } catch {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Spending this month
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">Unable to load spending data.</p>
        </CardContent>
      </Card>
    );
  }
}
