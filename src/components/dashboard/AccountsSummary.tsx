import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toNumber } from "@/lib/utils/currency";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/utils/accounts";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { AccountWithGroup } from "@/lib/queries/accounts";

interface AccountsSummaryProps {
  accounts: AccountWithGroup[];
}

export function AccountsSummary({ accounts }: AccountsSummaryProps) {
  const active = accounts.filter((a) => a.status === "ACTIVE").slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Accounts</CardTitle>
        <Link href="/accounts" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            No accounts. Sync to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {active.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${getAccountTypeColor(acc.type)}`}
                  >
                    {getAccountTypeLabel(acc.type)}
                  </Badge>
                  <span className="text-sm truncate">{acc.name}</span>
                </div>
                <span className={`text-sm font-semibold tabular-nums ml-2 shrink-0 ${
                  toNumber(acc.balance) < 0 ? "text-[#f7768e]" : ""
                }`}>
                  {formatCurrency(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
