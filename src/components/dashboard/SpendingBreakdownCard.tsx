import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpendingPieChart } from "@/components/charts/SpendingPieChart";
import { getMonthlySpendingByCategory } from "@/lib/queries/transactions";

export async function SpendingBreakdownCard() {
  let spending: Awaited<ReturnType<typeof getMonthlySpendingByCategory>> | null = null;

  try {
    spending = await getMonthlySpendingByCategory(new Date());
  } catch (error) {
    console.error("Failed to load monthly spending breakdown.", error);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Spending this month
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {spending !== null ? (
          <SpendingPieChart spending={spending} />
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load spending data.</p>
        )}
      </CardContent>
    </Card>
  );
}
