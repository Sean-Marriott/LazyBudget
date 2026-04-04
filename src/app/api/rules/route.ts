import { NextResponse } from "next/server";
import { getAllRules, createRule } from "@/lib/queries/rules";
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

export async function GET() {
  const rules = await getAllRules();
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { name, conditionCombinator, conditions, setCategory, setNotes, setTransfer, setHidden } =
    body as Record<string, unknown>;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (conditionCombinator !== undefined && (typeof conditionCombinator !== "string" || !ALLOWED_COMBINATORS.has(conditionCombinator))) {
    return NextResponse.json({ error: "conditionCombinator must be 'AND' or 'OR'" }, { status: 400 });
  }
  if (!validateConditions(conditions)) {
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

  const hasAction =
    (setCategory !== undefined && setCategory !== null) ||
    (setNotes !== undefined && setNotes !== null) ||
    (setTransfer !== undefined && setTransfer !== null) ||
    (setHidden !== undefined && setHidden !== null);

  if (!hasAction) {
    return NextResponse.json({ error: "at least one action (setCategory, setNotes, setTransfer, setHidden) is required" }, { status: 400 });
  }

  const rule = await createRule({
    name: name.trim(),
    conditionCombinator: (conditionCombinator as string | undefined) ?? "AND",
    conditions: (conditions as RuleCondition[]).map((c) => ({ ...c, value: c.value.trim() })),
    setCategory: setCategory as string | null | undefined,
    setNotes: typeof setNotes === "string" ? setNotes.trim() || null : null,
    setTransfer: setTransfer as boolean | null | undefined,
    setHidden: setHidden as boolean | null | undefined,
  });

  return NextResponse.json(rule, { status: 201 });
}
