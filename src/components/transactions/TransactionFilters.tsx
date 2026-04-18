"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMonthLabel } from "@/lib/utils/dates";
import { EXPENSE_CATEGORIES } from "@/lib/utils/categories";

interface TransactionFiltersProps {
  month: Date;
  category?: string;
  search?: string;
  customCategories?: Array<{ name: string }>;
}

export function TransactionFilters({ month, category, search, customCategories }: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");

  // Sync local search state when URL param changes (e.g. month navigation)
  useEffect(() => {
    setSearchValue(search ?? "");
  }, [search]);

  // Debounce search input → URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("search", searchValue);
      } else {
        params.delete("search");
      }
      router.push(`/transactions?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function navigateMonth(target: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(target, "yyyy-MM"));
    router.push(`/transactions?${params.toString()}`);
  }

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    router.push(`/transactions?${params.toString()}`);
  }

  const isCurrentMonth =
    format(month, "yyyy-MM") === format(startOfMonth(new Date()), "yyyy-MM");

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      {/* Month navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(subMonths(month, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground min-w-20 text-center">
          {formatMonthLabel(month)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(addMonths(month, 1))}
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Category filter */}
      <select
        value={category ?? ""}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">All categories</option>
        <optgroup label="Built-in">
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="Income">Income</option>
          <option value="Transfer">Transfer</option>
        </optgroup>
        {customCategories && customCategories.length > 0 && (
          <optgroup label="Custom">
            {customCategories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Search input */}
      <Input
        placeholder="Search transactions…"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-full sm:w-56"
      />
    </div>
  );
}
