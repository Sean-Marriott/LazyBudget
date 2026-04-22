"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";

function SparklineTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; balance: number } }> }) {
  if (!active || !payload?.length) return null;
  const { date, balance } = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-muted-foreground">{date}</p>
      <p className="font-semibold tabular-nums">{formatCurrency(balance)}</p>
    </div>
  );
}
import type { AccountBalanceHistory } from "@/lib/queries/insights";

interface Props {
  accounts: AccountBalanceHistory[];
}

export function MiniAccountList({ accounts }: Props) {
  if (accounts.length === 0) return null;

  return (
    <div className="space-y-3">
      {accounts.map((account, i) => {
        const isLiability = account.group === "liability";
        const hasHistory = account.snapshots.length >= 2;
        const change = hasHistory
          ? account.snapshots[account.snapshots.length - 1].balance -
            account.snapshots[0].balance
          : null;
        const lineColor =
          change === null
            ? "#565f89"
            : isLiability
            ? change > 0
              ? "#f7768e"
              : "#9ece6a"
            : change >= 0
            ? "#9ece6a"
            : "#f7768e";

        return (
          <div key={account.id}>
            {i > 0 && <div className="border-t mb-3" />}
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="text-xs font-medium truncate">{account.name}</p>
              <p className={`text-xs tabular-nums font-semibold shrink-0 ${isLiability ? "text-destructive" : ""}`}>
                {formatCurrencyCompact(account.currentValue)}
              </p>
            </div>
            {hasHistory ? (
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={account.snapshots}>
                  <Tooltip content={<SparklineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={lineColor}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[36px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
