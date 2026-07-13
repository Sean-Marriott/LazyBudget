import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getBudgetsForMonth, createBudget } from "@/lib/queries/budgets";
import { isUniqueViolation } from "@/lib/db/errors";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json(
      { error: "month is required in yyyy-MM format" },
      { status: 400 }
    );
  }

  const rows = await getBudgetsForMonth(user.id, `${month}-01`);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { month, category, amount, notes } = body as Record<string, unknown>;

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json(
      { error: "month is required in yyyy-MM format" },
      { status: 400 }
    );
  }
  if (!category || typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }

  try {
    const budget = await createBudget(user.id, {
      month: `${month}-01`,
      category: category.trim(),
      amount: amount.toFixed(2),
      notes: typeof notes === "string" ? notes.trim() || null : null,
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A budget for that category already exists this month" },
        { status: 409 }
      );
    }
    throw err;
  }
}
