"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RuleCard } from "@/components/rules/RuleCard";
import { RuleDialog } from "@/components/rules/RuleDialog";
import type { TransactionRule } from "@/lib/queries/rules";

interface RulesSectionProps {
  rules: TransactionRule[];
}

export function RulesSection({ rules }: RulesSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<number | null>(null);

  async function handleApply() {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/rules/apply", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const applied = typeof data?.applied === "number" ? data.applied : 0;
        setApplyResult(applied);
      } else {
        window.alert("Failed to apply rules. Please try again.");
      }
    } catch {
      window.alert("Network error. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Rules
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rules run automatically after each sync and apply to transactions with no manual category set.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center space-y-1">
            <p className="text-sm font-medium">No rules yet</p>
            <p className="text-xs text-muted-foreground">
              Add a rule to automatically categorise transactions on sync.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}

        {rules.length > 0 && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? "Applying…" : "Re-apply rules to all transactions"}
            </Button>
            {applyResult !== null && (
              <span className="text-sm text-muted-foreground">
                Applied to {applyResult} transaction{applyResult !== 1 ? "s" : ""}.
              </span>
            )}
          </div>
        )}
      </div>

      <RuleDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
