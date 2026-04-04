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
import {
  RULE_CONDITION_FIELDS,
  RULE_CONDITION_OPERATORS,
  RULE_CONDITION_FIELD_LABELS,
  RULE_CONDITION_OPERATOR_LABELS,
} from "@/lib/utils/rules";
import { EXPENSE_CATEGORIES } from "@/lib/utils/categories";
import type { TransactionRule } from "@/lib/queries/rules";
import type { RulePrefill } from "@/lib/utils/rules";

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, "Income", "Transfer"];

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: TransactionRule;
  initialValues?: RulePrefill;
}

export function RuleDialog({ open, onOpenChange, rule, initialValues }: RuleDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [conditionField, setConditionField] = useState<string>("description");
  const [conditionOperator, setConditionOperator] = useState<string>("contains");
  const [conditionValue, setConditionValue] = useState("");
  const [setCategory, setSetCategory] = useState("");
  const [setNotes, setSetNotes] = useState("");
  const [setTransfer, setSetTransfer] = useState(false);
  const [setHidden, setSetHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const src = rule ?? initialValues;
      setName(src?.name ?? "");
      setConditionField(src?.conditionField ?? "description");
      setConditionOperator(rule?.conditionOperator ?? "contains");
      setConditionValue(src?.conditionValue ?? "");
      setSetCategory(src?.setCategory ?? "");
      setSetNotes(src?.setNotes ?? "");
      setSetTransfer(src?.setTransfer ?? false);
      setSetHidden(src?.setHidden ?? false);
      setError(null);
    }
  }, [open, rule, initialValues]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!setCategory && !setNotes.trim() && !setTransfer && !setHidden) {
      setError("At least one action must be set.");
      return;
    }

    setSaving(true);
    try {
      const url = rule ? `/api/rules/${rule.id}` : "/api/rules";
      const method = rule ? "PATCH" : "POST";

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            conditionField,
            conditionOperator,
            conditionValue,
            setCategory: setCategory || null,
            setNotes: setNotes.trim() || null,
            setTransfer: setTransfer || null,
            setHidden: setHidden || null,
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

      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "Add rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              placeholder="e.g. Netflix → Entertainment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Condition</Label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={conditionField}
                onChange={(e) => setConditionField(e.target.value)}
                className={selectClass}
              >
                {RULE_CONDITION_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {RULE_CONDITION_FIELD_LABELS[f]}
                  </option>
                ))}
              </select>
              <select
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value)}
                className={selectClass}
              >
                {RULE_CONDITION_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {RULE_CONDITION_OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
              <Input
                placeholder="value…"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                required
                className="flex-1 min-w-32"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Actions <span className="text-muted-foreground font-normal">(at least one)</span></Label>
            <div className="space-y-2 pl-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Set category</span>
                <select
                  value={setCategory}
                  onChange={(e) => setSetCategory(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Don't change</option>
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-28 shrink-0">Set notes</span>
                <Input
                  placeholder="Don't change"
                  value={setNotes}
                  onChange={(e) => setSetNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rule-set-transfer"
                  type="checkbox"
                  checked={setTransfer}
                  onChange={(e) => setSetTransfer(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="rule-set-transfer" className="font-normal cursor-pointer">
                  Mark as transfer
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rule-set-hidden"
                  type="checkbox"
                  checked={setHidden}
                  onChange={(e) => setSetHidden(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="rule-set-hidden" className="font-normal cursor-pointer">
                  Hide transaction
                </Label>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : rule ? "Save changes" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
