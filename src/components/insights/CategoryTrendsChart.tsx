"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";
import { getCategoryColor } from "@/lib/utils/categories";

interface Props {
  categories: string[];
  data: Array<Record<string, string | number>>;
  customColorMap?: Record<string, string>;
}

const tooltipStyle = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "var(--foreground)",
};

export function CategoryTrendsChart({ categories, data, customColorMap = {} }: Props) {
  if (data.length === 0 || categories.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No spending data in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickFormatter={(d) => format(parseISO(d), "MMM yy")}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrencyCompact(v)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
          labelFormatter={(label) => format(parseISO(String(label)), "MMM yyyy")}
          contentStyle={tooltipStyle}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {categories.map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={getCategoryColor(cat, customColorMap)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
