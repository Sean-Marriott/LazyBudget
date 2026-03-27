import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { TrendingUp } from "lucide-react";

interface NetWorthCardProps {
  assets: number;
  liabilities: number;
  netWorth: number;
}

export function NetWorthCard({ assets, liabilities, netWorth }: NetWorthCardProps) {
  return (
    <Card className="col-span-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
            <p className="text-4xl font-bold tabular-nums">{formatCurrency(netWorth)}</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="flex gap-8 mt-6 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Assets</p>
            <p className="text-lg font-semibold text-[#9ece6a] tabular-nums">{formatCurrency(assets)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Liabilities</p>
            <p className="text-lg font-semibold text-[#f7768e] tabular-nums">{formatCurrency(liabilities)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
