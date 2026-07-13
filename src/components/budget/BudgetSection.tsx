"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetRow } from "@/components/budget/BudgetRow";
import { BudgetDialog } from "@/components/budget/BudgetDialog";
import type { BudgetLine } from "@/components/budget/BudgetDialog";
import { formatCurrency } from "@/lib/utils/currency";
import { formatMonthLabel } from "@/lib/utils/dates";

interface BudgetSectionProps {
  /** Selected month in "yyyy-MM" format. */
  month: string;
  lines: BudgetLine[];
  /** "yyyy-MM-dd" month with budgets to offer copying from, when this month is empty. */
  copySourceMonth: string | null;
  customCategoryNames: string[];
  /** Spending this month in categories without a budget line. */
  unbudgeted: Array<{ category: string; total: number }>;
}

export function BudgetSection({
  month,
  lines,
  copySourceMonth,
  customCategoryNames,
  unbudgeted,
}: BudgetSectionProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const budgetedNames = lines.map((l) => l.category);

  async function handleCopy() {
    setCopying(true);
    setCopyError(null);
    try {
      let res: Response;
      try {
        res = await fetch("/api/budgets/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month }),
        });
      } catch {
        setCopyError("Network error. Please check your connection and try again.");
        return;
      }
      if (!res.ok) {
        let message = "Failed to copy budgets";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {}
        setCopyError(message);
        return;
      }
      router.refresh();
    } finally {
      setCopying(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Budget lines
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set a monthly spending limit per category.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add budget
          </Button>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">No budgets for this month yet</p>
              <p className="text-xs text-muted-foreground">
                Add a budget line, or copy last month&apos;s budgets to get started.
              </p>
            </div>
            {copySourceMonth && (
              <Button
                variant="outline"
                size="sm"
                disabled={copying}
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copying
                  ? "Copying…"
                  : `Copy from ${formatMonthLabel(copySourceMonth)}`}
              </Button>
            )}
            {copyError && <p className="text-sm text-destructive">{copyError}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <BudgetRow
                key={line.id}
                line={line}
                month={month}
                customCategoryNames={customCategoryNames}
                budgetedNames={budgetedNames}
              />
            ))}
          </div>
        )}

        {unbudgeted.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Unbudgeted spending
            </h3>
            <div className="rounded-lg border divide-y">
              {unbudgeted.map((u) => (
                <div
                  key={u.category}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{u.category}</span>
                  <span className="tabular-nums">{formatCurrency(u.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BudgetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        month={month}
        customCategoryNames={customCategoryNames}
        budgetedNames={budgetedNames}
      />
    </>
  );
}
