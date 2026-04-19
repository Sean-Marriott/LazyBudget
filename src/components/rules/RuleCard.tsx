"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RuleDialog } from "./RuleDialog";
import {
  RULE_CONDITION_FIELD_LABELS,
  RULE_CONDITION_OPERATOR_LABELS,
} from "@/lib/utils/rules";
import type { TransactionRule } from "@/lib/queries/rules";
import type { RuleCondition } from "@/lib/utils/rules";

interface RuleCardProps {
  rule: TransactionRule;
  customCategories?: Array<{ name: string }>;
}

export function RuleCard({ rule, customCategories }: RuleCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  async function handleToggle() {
    await fetch(`/api/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    const res = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      window.alert("Failed to delete rule. Please try again.");
    }
  }

  const conditions = Array.isArray(rule.conditions) ? (rule.conditions as RuleCondition[]) : [];
  const combinator = rule.conditionCombinator ?? "AND";

  const actions: string[] = [];
  if (rule.setCategory) actions.push(`category → ${rule.setCategory}`);
  if (rule.setNotes) actions.push(`notes → "${rule.setNotes}"`);
  if (rule.setTransfer) actions.push("mark as transfer");
  if (rule.setHidden) actions.push("hide");

  return (
    <>
      <div className={`rounded-lg border p-4 flex items-start gap-3 ${!rule.enabled ? "opacity-50" : ""}`}>
        {/* Enable/disable toggle */}
        <button
          onClick={handleToggle}
          className="mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: rule.enabled ? "#7aa2f7" : "#414868" }}
          title={rule.enabled ? "Disable rule" : "Enable rule"}
          aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
        >
          <span
            className="block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5"
            style={{ transform: rule.enabled ? "translateX(16px)" : "translateX(0)" }}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{rule.name}</p>
          <div className="mt-0.5 space-y-0.5">
            {conditions.map((c, i) => {
              const fieldLabel = RULE_CONDITION_FIELD_LABELS[c.field] ?? c.field;
              const opLabel = RULE_CONDITION_OPERATOR_LABELS[c.operator] ?? c.operator;
              return (
                <p key={i} className="text-xs text-muted-foreground">
                  {i > 0 && (
                    <span className="font-medium text-foreground/60 mr-1">{combinator}</span>
                  )}
                  {fieldLabel} {opLabel}{" "}
                  <span className="font-mono bg-muted px-1 rounded">{c.value}</span>
                </p>
              );
            })}
          </div>
          {actions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              → {actions.join(", ")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditOpen(true)}
            aria-label="Edit rule"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <RuleDialog open={editOpen} onOpenChange={setEditOpen} rule={rule} customCategories={customCategories} />
    </>
  );
}
