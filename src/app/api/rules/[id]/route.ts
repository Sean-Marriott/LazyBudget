import { NextResponse } from "next/server";
import { updateRule, deleteRule } from "@/lib/queries/rules";
import { RULE_CONDITION_FIELDS, RULE_CONDITION_OPERATORS } from "@/lib/utils/rules";
import { EXPENSE_CATEGORIES } from "@/lib/utils/categories";

const ALLOWED_FIELDS = new Set<string>(RULE_CONDITION_FIELDS);
const ALLOWED_OPERATORS = new Set<string>(RULE_CONDITION_OPERATORS);
const ALLOWED_CATEGORIES = new Set<string>([...EXPENSE_CATEGORIES, "Income", "Transfer"]);

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

  const { name, enabled, conditionField, conditionOperator, conditionValue, setCategory, setNotes, setTransfer, setHidden } =
    body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  if (conditionField !== undefined && (typeof conditionField !== "string" || !ALLOWED_FIELDS.has(conditionField))) {
    return NextResponse.json({ error: "invalid conditionField" }, { status: 400 });
  }
  if (conditionOperator !== undefined && (typeof conditionOperator !== "string" || !ALLOWED_OPERATORS.has(conditionOperator))) {
    return NextResponse.json({ error: "invalid conditionOperator" }, { status: 400 });
  }
  if (conditionValue !== undefined && (typeof conditionValue !== "string" || !conditionValue.trim())) {
    return NextResponse.json({ error: "conditionValue must be a non-empty string" }, { status: 400 });
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

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = (name as string).trim();
  if (enabled !== undefined) data.enabled = enabled;
  if (conditionField !== undefined) data.conditionField = conditionField;
  if (conditionOperator !== undefined) data.conditionOperator = conditionOperator;
  if (conditionValue !== undefined) data.conditionValue = (conditionValue as string).trim();
  if (setCategory !== undefined) data.setCategory = setCategory;
  if (setNotes !== undefined) data.setNotes = typeof setNotes === "string" ? setNotes.trim() || null : null;
  if (setTransfer !== undefined) data.setTransfer = setTransfer;
  if (setHidden !== undefined) data.setHidden = setHidden;

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
