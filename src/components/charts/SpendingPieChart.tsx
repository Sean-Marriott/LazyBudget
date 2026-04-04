"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";
import { getCategoryColor } from "@/lib/utils/categories";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";

interface Props {
  spending: { category: string; total: number }[];
  height?: number;
}

export function SpendingPieChart({ spending, height = 300 }: Props) {
  const hasData = spending.length > 0 && spending.some((s) => s.total > 0);
  const total = spending.reduce((sum, s) => sum + s.total, 0);
  if (!hasData) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No spending data this month.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={spending}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          label={({ value }) => formatCurrencyCompact(Number(value))}
          labelLine={{ stroke: "#414868", strokeWidth: 1 }}
        >
          {spending.map((entry) => (
            <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
          ))}
          <Label
            content={({ viewBox }) => {
              const { cx, cy } = viewBox as { cx: number; cy: number };
              return (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  role="img"
                  aria-label={`Total spending ${formatCurrency(total)}`}
                >
                  <tspan x={cx} dy="-1.75em" fill="#a9b1d6" fontSize={12}>Total</tspan>
                  <tspan x={cx} dy="1.25em" fill="#c0caf5" fontSize={15} fontWeight={500}>
                    {formatCurrency(total)}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), ""]}
          contentStyle={{
            backgroundColor: "#1a1b26",
            border: "1px solid #2e3250",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#c0caf5",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
