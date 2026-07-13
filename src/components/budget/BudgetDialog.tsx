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

export interface BudgetLine {
  id: number;
  category: string;
  amount: number;
  notes: string | null;
  spent: number;
  color: string;
}

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Target month in "yyyy-MM" format. */
  month: string;
  /** When set, the dialog edits this line instead of creating one. */
  budget?: BudgetLine;
  customCategoryNames: string[];
  /** Categories that already have a line this month (hidden from the picker). */
  budgetedNames: string[];
}

export function BudgetDialog({
  open,
  onOpenChange,
  month,
  budget,
  customCategoryNames,
  budgetedNames,
}: BudgetDialogProps) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory(budget?.category ?? "");
      setAmount(budget ? String(budget.amount) : "");
      setNotes(budget?.notes ?? "");
      setError(null);
    }
  }, [open, budget]);

  const customOnly = customCategoryNames.filter(
    (n) => !EXPENSE_CATEGORIES.includes(n)
  );
  const isAvailable = (name: string) =>
    !budgetedNames.includes(name) || name === budget?.category;
  const builtInOptions = EXPENSE_CATEGORIES.filter(isAvailable);
  const customOptions = customOnly.filter(isAvailable);
  const noOptions = builtInOptions.length === 0 && customOptions.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!category) {
      setError("Choose a category");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    setSaving(true);
    try {
      const url = budget ? `/api/budgets/${budget.id}` : "/api/budgets";
      const method = budget ? "PATCH" : "POST";
      const payload = budget
        ? { category, amount: parsedAmount, notes: notes.trim() || null }
        : { month, category, amount: parsedAmount, notes: notes.trim() || null };

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "Add budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-category">Category</Label>
            <select
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={noOptions}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Choose a category…</option>
              {builtInOptions.length > 0 && (
                <optgroup label="Built-in">
                  {builtInOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
              {customOptions.length > 0 && (
                <optgroup label="Custom">
                  {customOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {noOptions && (
              <p className="text-xs text-muted-foreground">
                All categories already have a budget this month.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Monthly amount (NZD)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-notes">Notes (optional)</Label>
            <Input
              id="budget-notes"
              placeholder="Add a note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving || noOptions}>
              {saving ? "Saving…" : budget ? "Save changes" : "Add budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
