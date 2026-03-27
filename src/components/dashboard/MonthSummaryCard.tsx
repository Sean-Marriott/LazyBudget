import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatMonthLabel } from "@/lib/utils/dates";
import { ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";

interface MonthSummaryCardProps {
  month: Date;
  income: number;
  expenses: number;
  net: number;
}

export function MonthSummaryCard({ month, income, expenses, net }: MonthSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {formatMonthLabel(month)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowDownLeft className="h-4 w-4 text-[#9ece6a]" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <span className="font-semibold tabular-nums text-[#9ece6a]">{formatCurrency(income)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowUpRight className="h-4 w-4 text-[#f7768e]" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <span className="font-semibold tabular-nums text-[#f7768e]">{formatCurrency(expenses)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Minus className="h-4 w-4" />
            <span className="font-medium">Net</span>
          </div>
          <span className={`font-bold tabular-nums ${net >= 0 ? "text-[#9ece6a]" : "text-[#f7768e]"}`}>
            {formatCurrency(net)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
