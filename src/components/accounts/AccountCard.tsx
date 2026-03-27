import Image from "next/image";
import {
  CreditCard,
  Banknote,
  PiggyBank,
  TrendingUp,
  Globe,
  Receipt,
  Gift,
  Wallet,
  Building,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, toNumber } from "@/lib/utils/currency";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/utils/accounts";
import type { AccountWithGroup } from "@/lib/queries/accounts";

function AccountTypeIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
  switch (type) {
    case "CHECKING": return <Banknote className={cls} />;
    case "SAVINGS": return <PiggyBank className={cls} />;
    case "CREDITCARD": return <CreditCard className={cls} />;
    case "LOAN": return <Building className={cls} />;
    case "KIWISAVER":
    case "INVESTMENT": return <TrendingUp className={cls} />;
    case "TERMDEPOSIT": return <Receipt className={cls} />;
    case "FOREIGN": return <Globe className={cls} />;
    case "REWARDS": return <Gift className={cls} />;
    case "WALLET": return <Wallet className={cls} />;
    default: return <Banknote className={cls} />;
  }
}

interface AccountCardProps {
  account: AccountWithGroup;
}

export function AccountCard({ account }: AccountCardProps) {
  const balance = toNumber(account.balance);
  const isNegative = balance < 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: logo + name */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {account.connectionLogo ? (
                <Image
                  src={account.connectionLogo}
                  alt={account.connectionName ?? ""}
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <AccountTypeIcon type={account.type} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {account.connectionName}
                {account.formattedAccount && ` · ${account.formattedAccount}`}
              </p>
            </div>
          </div>

          {/* Right: balance */}
          <div className="text-right shrink-0">
            <p
              className={`font-bold text-lg tabular-nums ${
                isNegative ? "text-destructive" : ""
              }`}
            >
              {formatCurrency(balance)}
            </p>
            {account.availableBalance && account.availableBalance !== account.balance && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(account.availableBalance)} available
              </p>
            )}
          </div>
        </div>

        {/* Footer: type badge + status */}
        <div className="flex items-center gap-2 mt-3">
          <Badge
            variant="secondary"
            className={`text-xs ${getAccountTypeColor(account.type)}`}
          >
            {getAccountTypeLabel(account.type)}
          </Badge>
          {account.status === "INACTIVE" && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
