import { formatCurrency } from "@/lib/utils/currency";

interface BudgetSummaryProps {
  budgeted: number;
  spent: number;
  remaining: number;
}

export function BudgetSummary({ budgeted, spent, remaining }: BudgetSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Budgeted</p>
        <p className="text-lg font-semibold tabular-nums mt-1">{formatCurrency(budgeted)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Spent</p>
        <p className="text-lg font-semibold tabular-nums mt-1">{formatCurrency(spent)}</p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
        <p
          className={`text-lg font-semibold tabular-nums mt-1 ${
            remaining >= 0 ? "text-[#9ece6a]" : "text-[#f7768e]"
          }`}
        >
          {formatCurrency(remaining)}
        </p>
      </div>
    </div>
  );
}
