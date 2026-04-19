"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

export type Range = "3m" | "6m" | "1y" | "all";

const OPTIONS: { label: string; value: Range }[] = [
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
  { label: "All", value: "all" },
];

interface RangeSelectorProps {
  value: Range;
}

export function RangeSelector({ value }: RangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setRange = useCallback(
    (range: Range) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("range", range);
      router.push(`/insights?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRange(opt.value)}
          className="h-7 px-2.5 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
