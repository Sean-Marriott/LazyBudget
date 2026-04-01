"use client";

import { useRouter } from "next/navigation";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/utils/dates";

interface Props {
  month: Date;
}

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
