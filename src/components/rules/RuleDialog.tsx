"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
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
import type { RulePrefill, RuleCondition } from "@/lib/utils/rules";

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, "Income", "Transfer"];

const DEFAULT_CONDITION: RuleCondition = { field: "description", operator: "contains", value: "" };

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: TransactionRule;
  initialValues?: RulePrefill;
  customCategories?: Array<{ name: string }>;
}

export function RuleDialog({ open, onOpenChange, rule, initialValues, customCategories }: RuleDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState<RuleCondition[]>([{ ...DEFAULT_CONDITION }]);
  const [conditionCombinator, setConditionCombinator] = useState<"AND" | "OR">("AND");
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
      const srcConditions = rule?.conditions ?? initialValues?.conditions;
      setConditions(
        Array.isArray(srcConditions) && srcConditions.length > 0
          ? (srcConditions as RuleCondition[])
          : [{ ...DEFAULT_CONDITION }]
      );
      setConditionCombinator((rule?.conditionCombinator ?? initialValues?.conditionCombinator ?? "AND") as "AND" | "OR");
      setSetCategory(src?.setCategory ?? "");
      setSetNotes(src?.setNotes ?? "");
      setSetTransfer(src?.setTransfer ?? false);
      setSetHidden(src?.setHidden ?? false);
      setError(null);
    }
  }, [open, rule, initialValues]);

  function updateCondition(index: number, patch: Partial<RuleCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCondition() {
    setConditions((prev) => [...prev, { ...DEFAULT_CONDITION }]);
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault();
    setError(null);

    // Validate all condition values are non-empty
    for (const c of conditions) {
      if (!c.value.trim()) {
        setError("All condition values must be filled in.");
        return;
      }
    }

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
            conditionCombinator,
            conditions,
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
            <div className="flex items-center justify-between">
              <Label>Conditions</Label>
              {conditions.length >= 2 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Match</span>
                  <button
                    type="button"
                    onClick={() => setConditionCombinator("AND")}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      conditionCombinator === "AND"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    onClick={() => setConditionCombinator("OR")}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      conditionCombinator === "OR"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    OR
                  </button>
                  <span className="text-xs text-muted-foreground ml-1">conditions</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {conditions.map((condition, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value as RuleCondition["field"] })}
                    className={selectClass}
                  >
                    {RULE_CONDITION_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {RULE_CONDITION_FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(i, { operator: e.target.value as RuleCondition["operator"] })}
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
                    value={condition.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="flex-1 min-w-32"
                  />
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Remove condition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add condition
              </button>
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
                  <optgroup label="Built-in">
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  {customCategories && customCategories.length > 0 && (
                    <optgroup label="Custom">
                      {customCategories.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
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
