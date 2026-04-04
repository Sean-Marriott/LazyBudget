import { NextResponse } from "next/server";
import { getRuleById, updateRule, deleteRule } from "@/lib/queries/rules";
import type { RuleInput } from "@/lib/queries/rules";
import { RULE_CONDITION_FIELDS, RULE_CONDITION_OPERATORS, RULE_CONDITION_COMBINATORS } from "@/lib/utils/rules";
import { EXPENSE_CATEGORIES } from "@/lib/utils/categories";
import type { RuleCondition } from "@/lib/utils/rules";

const ALLOWED_FIELDS = new Set<string>(RULE_CONDITION_FIELDS);
const ALLOWED_OPERATORS = new Set<string>(RULE_CONDITION_OPERATORS);
const ALLOWED_COMBINATORS = new Set<string>(RULE_CONDITION_COMBINATORS);
const ALLOWED_CATEGORIES = new Set<string>([...EXPENSE_CATEGORIES, "Income", "Transfer"]);

function validateConditions(conditions: unknown): conditions is RuleCondition[] {
  if (!Array.isArray(conditions) || conditions.length === 0) return false;
  for (const c of conditions) {
    if (typeof c !== "object" || c === null) return false;
    const { field, operator, value } = c as Record<string, unknown>;
    if (typeof field !== "string" || !ALLOWED_FIELDS.has(field)) return false;
    if (typeof operator !== "string" || !ALLOWED_OPERATORS.has(operator)) return false;
    if (typeof value !== "string" || !value.trim()) return false;
  }
  return true;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { name, enabled, conditionCombinator, conditions, setCategory, setNotes, setTransfer, setHidden } =
    body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  if (conditionCombinator !== undefined && (typeof conditionCombinator !== "string" || !ALLOWED_COMBINATORS.has(conditionCombinator))) {
    return NextResponse.json({ error: "conditionCombinator must be 'AND' or 'OR'" }, { status: 400 });
  }
  if (conditions !== undefined && !validateConditions(conditions)) {
    return NextResponse.json(
      { error: "conditions must be a non-empty array of { field, operator, value } objects with valid values" },
      { status: 400 }
    );
  }
  if (setCategory !== undefined && setCategory !== null) {
    if (typeof setCategory !== "string" || !ALLOWED_CATEGORIES.has(setCategory)) {
      return NextResponse.json({ error: "invalid setCategory" }, { status: 400 });
    }
  }
  if (setNotes !== undefined && setNotes !== null && typeof setNotes !== "string") {
    return NextResponse.json({ error: "setNotes must be a string" }, { status: 400 });
  }
  if (setTransfer !== undefined && setTransfer !== null && typeof setTransfer !== "boolean") {
    return NextResponse.json({ error: "setTransfer must be a boolean" }, { status: 400 });
  }
  if (setHidden !== undefined && setHidden !== null && typeof setHidden !== "boolean") {
    return NextResponse.json({ error: "setHidden must be a boolean" }, { status: 400 });
  }

  const existing = await getRuleById(numId);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: Partial<RuleInput> = {};
  if (name !== undefined) data.name = (name as string).trim();
  if (enabled !== undefined) data.enabled = enabled as boolean;
  if (conditionCombinator !== undefined) data.conditionCombinator = conditionCombinator as string;
  if (conditions !== undefined) {
    data.conditions = (conditions as RuleCondition[]).map((c) => ({ ...c, value: c.value.trim() }));
  }
  if (setCategory !== undefined) data.setCategory = setCategory as string | null;
  if (setNotes !== undefined) data.setNotes = typeof setNotes === "string" ? setNotes.trim() || null : null;
  if (setTransfer !== undefined) data.setTransfer = setTransfer as boolean | null;
  if (setHidden !== undefined) data.setHidden = setHidden as boolean | null;

  // Validate that the merged rule still performs at least one action
  const mergedCategory = "setCategory" in data ? data.setCategory : existing.setCategory;
  const mergedNotes = "setNotes" in data ? data.setNotes : existing.setNotes;
  const mergedTransfer = "setTransfer" in data ? data.setTransfer : existing.setTransfer;
  const mergedHidden = "setHidden" in data ? data.setHidden : existing.setHidden;
  const hasAction =
    (mergedCategory !== null && mergedCategory !== undefined) ||
    (mergedNotes !== null && mergedNotes !== undefined) ||
    (mergedTransfer !== null && mergedTransfer !== undefined) ||
    (mergedHidden !== null && mergedHidden !== undefined);
  if (!hasAction) {
    return NextResponse.json(
      { error: "at least one action (setCategory, setNotes, setTransfer, setHidden) is required" },
      { status: 400 }
    );
  }

  const rule = await updateRule(numId, data);
  if (!rule) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(rule);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await deleteRule(numId);
  return new NextResponse(null, { status: 204 });
}
