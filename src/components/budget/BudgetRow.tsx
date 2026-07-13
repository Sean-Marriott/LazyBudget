"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetDialog } from "@/components/budget/BudgetDialog";
import type { BudgetLine } from "@/components/budget/BudgetDialog";
import { formatCurrency } from "@/lib/utils/currency";

interface BudgetRowProps {
  line: BudgetLine;
  month: string;
  customCategoryNames: string[];
  budgetedNames: string[];
}

const OVER_COLOR = "#f7768e";

export function BudgetRow({
  line,
  month,
  customCategoryNames,
  budgetedNames,
}: BudgetRowProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remaining = line.amount - line.spent;
  const over = remaining < 0;
  const pct = line.amount > 0 ? Math.min(100, (line.spent / line.amount) * 100) : 0;

  async function handleDelete() {
    if (!window.confirm(`Delete the "${line.category}" budget for this month?`)) return;

    setDeleting(true);
    try {
      let res: Response;
      try {
        res = await fetch(`/api/budgets/${line.id}`, { method: "DELETE" });
      } catch {
        window.alert("Failed to delete budget. Please try again.");
        return;
      }
      if (res.ok) {
        router.refresh();
      } else {
        window.alert("Failed to delete budget. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: line.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{line.category}</p>
            {line.notes && (
              <p className="text-xs text-muted-foreground truncate">{line.notes}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium tabular-nums">
              {formatCurrency(line.spent)}{" "}
              <span className="text-muted-foreground font-normal">
                / {formatCurrency(line.amount)}
              </span>
            </p>
            <p
              className={`text-xs tabular-nums ${
                over ? "text-[#f7768e]" : "text-[#9ece6a]"
              }`}
            >
              {over
                ? `over by ${formatCurrency(-remaining)}`
                : `${formatCurrency(remaining)} left`}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Edit budget"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label="Delete budget"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: over ? OVER_COLOR : line.color,
            }}
          />
        </div>
      </div>

      <BudgetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        month={month}
        budget={line}
        customCategoryNames={customCategoryNames}
        budgetedNames={budgetedNames}
      />
    </>
  );
}
