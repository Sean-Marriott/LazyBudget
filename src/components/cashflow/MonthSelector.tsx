"use client";

import { useRouter } from "next/navigation";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/utils/dates";

interface Props {
  month: Date;
}

/**
 * Render a month navigation control used by the cashflow view.
 *
 * The control displays the given month as a label with left/right chevron buttons
 * to navigate to the previous or next month. Navigation updates the URL to
 * /cashflow?month=YYYY-MM. The "next" button is disabled when `month` is the
 * current calendar month.
 *
 * @param month - Date representing the month to display and navigate from (year and month are used)
 * @returns A React element with month navigation buttons and a centered month label
 */
export function MonthSelector({ month }: Props) {
  const router = useRouter();

  function navigate(target: Date) {
    router.push(`/cashflow?month=${format(target, "yyyy-MM")}`);
  }

  const isCurrentMonth =
    format(month, "yyyy-MM") === format(startOfMonth(new Date()), "yyyy-MM");

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => navigate(subMonths(month, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium text-muted-foreground min-w-[80px] text-center">
        {formatMonthLabel(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(addMonths(month, 1))}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
