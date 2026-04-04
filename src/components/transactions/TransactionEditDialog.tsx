"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES } from "@/lib/utils/categories";
import {
  RULE_CONDITION_FIELD_LABELS,
  RULE_CONDITION_OPERATOR_LABELS,
} from "@/lib/utils/rules";
import type { RulePrefill } from "@/lib/utils/rules";
import type { getTransactions } from "@/lib/queries/transactions";

type TransactionRow = Awaited<ReturnType<typeof getTransactions>>[number];

interface TransactionEditDialogProps {
  transaction: TransactionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRule?: (prefill: RulePrefill) => void;
}

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
  onCreateRule,
}: TransactionEditDialogProps) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isTransfer, setIsTransfer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"edit" | "prompt">("edit");
  const [rulePrefill, setRulePrefill] = useState<RulePrefill | null>(null);

  useEffect(() => {
    if (open) {
      setCategory(transaction.userCategory ?? "");
      setNotes(transaction.notes ?? "");
      setIsTransfer(transaction.isTransfer ?? false);
      setIsHidden(transaction.isHidden ?? false);
      setError(null);
      setStep("edit");
      setRulePrefill(null);
    }
  }, [open, transaction.id]);

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let res: Response;
      try {
        res = await fetch(`/api/transactions/${transaction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userCategory: category || null,
            notes: notes.trim() || null,
            isTransfer,
            isHidden,
          }),
        });
      } catch {
        setError("Network error. Please check your connection and try again.");
        return;
      }

      if (!res.ok) {
        let message = "Something went wrong";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {}
        setError(message);
        return;
      }

      router.refresh();

      // Only prompt for rule creation when an action actually changed
      const originalCategory = transaction.userCategory ?? "";
      const originalNotes = transaction.notes ?? "";
      const originalIsTransfer = transaction.isTransfer ?? false;
      const originalIsHidden = transaction.isHidden ?? false;

      const trimmedNotes = notes.trim();
      const categoryChanged = category !== originalCategory;
      const notesChanged = trimmedNotes !== originalNotes;
      const isTransferChanged = isTransfer !== originalIsTransfer;
      const isHiddenChanged = isHidden !== originalIsHidden;

      const hasRulableAction =
        (categoryChanged && !!category) ||
        (isTransferChanged && isTransfer) ||
        (isHiddenChanged && isHidden);

      if (hasRulableAction && onCreateRule) {
        const conditionField = transaction.merchantName ? "merchantName" : "description";
        const conditionValue = (transaction.merchantName ?? transaction.description).trim();
        const suggestedName = category
          ? `${conditionValue} → ${category}`
          : conditionValue;

        const prefill: RulePrefill = {
          name: suggestedName.slice(0, 80),
          conditions: [{ field: conditionField, operator: "contains", value: conditionValue }],
          ...(categoryChanged && category ? { setCategory: category } : {}),
          ...(notesChanged && trimmedNotes ? { setNotes: trimmedNotes } : {}),
          ...(isTransferChanged && isTransfer ? { setTransfer: true } : {}),
          ...(isHiddenChanged && isHidden ? { setHidden: true } : {}),
        };
        setRulePrefill(prefill);
        setStep("prompt");
      } else {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCreateRule() {
    if (rulePrefill && onCreateRule) {
      onCreateRule(rulePrefill);
    }
    onOpenChange(false);
  }

  const allCategories = [...EXPENSE_CATEGORIES, "Income", "Transfer"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === "edit" ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit transaction</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-2">
              {transaction.merchantName ?? transaction.description}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-category">Category</Label>
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Auto-detect</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-notes">Notes (optional)</Label>
                <Input
                  id="tx-notes"
                  placeholder="Add a note…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="tx-transfer"
                  type="checkbox"
                  checked={isTransfer}
                  onChange={(e) => setIsTransfer(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="tx-transfer" className="font-normal cursor-pointer">
                  Mark as transfer
                </Label>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    id="tx-hidden"
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="tx-hidden" className="font-normal cursor-pointer">
                    Hide transaction
                  </Label>
                </div>
                {isHidden && (
                  <p className="text-xs text-muted-foreground pl-6">
                    This transaction won't appear in any views.
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter showCloseButton>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create a rule?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automatically apply these changes to similar transactions in future syncs?
              </p>
              {rulePrefill && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {RULE_CONDITION_FIELD_LABELS[rulePrefill.conditions[0].field]}
                    </span>{" "}
                    {RULE_CONDITION_OPERATOR_LABELS[rulePrefill.conditions[0].operator]}{" "}
                    <span className="font-mono bg-muted px-1 rounded">
                      {rulePrefill.conditions[0].value}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    →{" "}
                    {[
                      rulePrefill.setCategory,
                      rulePrefill.setNotes && `note: "${rulePrefill.setNotes}"`,
                      rulePrefill.setTransfer && "mark as transfer",
                      rulePrefill.setHidden && "hide",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                You can edit the rule name and condition on the next screen.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                No thanks
              </Button>
              <Button onClick={handleCreateRule}>Create rule</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
