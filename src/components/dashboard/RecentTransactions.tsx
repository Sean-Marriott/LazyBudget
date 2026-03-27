import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateShort } from "@/lib/utils/dates";
import { getCategoryColor, getCategoryLabel } from "@/lib/utils/categories";
import { toNumber } from "@/lib/utils/currency";
import type { getRecentTransactions } from "@/lib/queries/transactions";

type Transaction = Awaited<ReturnType<typeof getRecentTransactions>>[number];

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No transactions yet. Click Sync to fetch your data.
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const amount = toNumber(tx.amount);
              const category = tx.userCategory ?? tx.akahuCategoryGroup;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {tx.merchantName ?? tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDateShort(tx.date)} · {tx.accountName}
                      </span>
                      {category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: getCategoryColor(category) + "20",
                            color: getCategoryColor(category),
                          }}
                        >
                          {getCategoryLabel(category)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`ml-4 font-semibold tabular-nums text-sm shrink-0 ${
                      amount >= 0 ? "text-[#9ece6a]" : ""
                    }`}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatCurrency(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
