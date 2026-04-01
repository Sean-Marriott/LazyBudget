import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CashflowSankey } from "@/components/cashflow/CashflowSankey";
import { MonthSelector } from "@/components/cashflow/MonthSelector";
import { getMonthSummary, getMonthlySpendingByCategory } from "@/lib/queries/transactions";
import { parse, startOfMonth } from "date-fns";

interface SearchParams {
  month?: string;
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { month: monthParam } = await searchParams;

  const month = monthParam
    ? startOfMonth(parse(monthParam, "yyyy-MM", new Date()))
    : startOfMonth(new Date());

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
      </main>
    </>
  );
}
