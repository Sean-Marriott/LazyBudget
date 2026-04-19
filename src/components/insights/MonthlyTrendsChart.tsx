"use client";

import {
  ComposedChart,
  Bar,
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

interface Props {
  data: Array<{ month: string; income: number; spending: number; net: number }>;
  height?: number;
}

const tooltipStyle = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "var(--foreground)",
};

export function MonthlyTrendsChart({ data, height = 280 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No transaction data in this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === "income" ? "Income" : name === "spending" ? "Spending" : "Net",
          ]}
          labelFormatter={(label) => format(parseISO(String(label)), "MMM yyyy")}
          contentStyle={tooltipStyle}
        />
        <Legend
          formatter={(value) =>
            value === "income" ? "Income" : value === "spending" ? "Spending" : "Net"
          }
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="income" fill="#9ece6a" opacity={0.85} barSize={16} />
        <Bar dataKey="spending" fill="#ff9e64" opacity={0.85} barSize={16} />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#7dcfff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#7dcfff" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
