"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Banknote,
  PiggyBank,
  TrendingUp,
  Globe,
  Receipt,
  Wallet,
  Building,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toNumber } from "@/lib/utils/currency";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/utils/accounts";
import { ManualAccountDialog } from "@/components/accounts/ManualAccountDialog";
import type { ManualAccountWithGroup } from "@/lib/queries/manual-accounts";

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
    case "WALLET": return <Wallet className={cls} />;
    default: return <Banknote className={cls} />;
  }
}

interface ManualAccountCardProps {
  account: ManualAccountWithGroup;
}

export function ManualAccountCard({ account }: ManualAccountCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const balance = toNumber(account.balance);
  const isNegative = balance < 0;

  async function handleDelete() {
    if (!window.confirm(`Delete "${account.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/manual-accounts/${account.id}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Failed to delete account. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      window.alert("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <AccountTypeIcon type={account.type} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{account.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {account.notes ?? "Manual account"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-bold text-lg tabular-nums ${isNegative ? "text-destructive" : ""}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Badge
              variant="secondary"
              className={`text-xs ${getAccountTypeColor(account.type)}`}
            >
              {getAccountTypeLabel(account.type)}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditOpen(true)}
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ManualAccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
      />
    </>
  );
}
