"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManualAccountCard } from "@/components/accounts/ManualAccountCard";
import { ManualAccountDialog } from "@/components/accounts/ManualAccountDialog";
import type { ManualAccountWithGroup } from "@/lib/queries/manual-accounts";

interface ManualAccountsSectionProps {
  accounts: ManualAccountWithGroup[];
}

export function ManualAccountsSection({ accounts }: ManualAccountsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Manual Accounts
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add account
        </Button>
      </div>
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <ManualAccountCard key={a.id} account={a} />
          ))}
        </div>
      )}
      <ManualAccountDialog open={addOpen} onOpenChange={setAddOpen} />
    </section>
  );
}
