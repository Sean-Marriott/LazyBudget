"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";
import { getAccountTypeLabel } from "@/lib/utils/accounts";
import type { AccountBalanceHistory } from "@/lib/queries/insights";

interface Props {
  account: AccountBalanceHistory;
}

export function AccountBalanceCard({ account }: Props) {
  const hasHistory = account.snapshots.length >= 2;
  const isLiability = account.group === "liability";

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

  const typeLabel =
    account.type === "ASSET" ? "Other Asset" : getAccountTypeLabel(account.type);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{account.name}</p>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm font-bold tabular-nums ${isLiability ? "text-destructive" : ""}`}>
              {formatCurrencyCompact(account.currentValue)}
            </p>
            {change !== null && (
              <p
                className={`text-xs tabular-nums ${
                  isLiability
                    ? change > 0
                      ? "text-destructive"
                      : "text-[#9ece6a]"
                    : change >= 0
                    ? "text-[#9ece6a]"
                    : "text-destructive"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {formatCurrency(change)}
              </p>
            )}
          </div>
        </div>

        {hasHistory ? (
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={account.snapshots}>
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
          <div className="h-[60px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {account.isManual
                ? "Use ↻ to record history"
                : "No data in selected range"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
