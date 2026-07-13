import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getBudgetById,
  updateBudget,
  deleteBudget,
} from "@/lib/queries/budgets";
import { isUniqueViolation } from "@/lib/db/errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const { category, amount, notes } = body as Record<string, unknown>;

  if (
    category !== undefined &&
    (typeof category !== "string" || !category.trim())
  ) {
    return NextResponse.json(
      { error: "category must be a non-empty string" },
      { status: 400 }
    );
  }
  if (
    amount !== undefined &&
    (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
  ) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }

  const existing = await getBudgetById(user.id, numId);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: { category?: string; amount?: string; notes?: string | null } = {};
  if (category !== undefined) data.category = (category as string).trim();
  if (amount !== undefined) data.amount = (amount as number).toFixed(2);
  if (notes !== undefined) {
    data.notes = typeof notes === "string" ? notes.trim() || null : null;
  }

  try {
    const budget = await updateBudget(user.id, numId, data);
    if (!budget) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(budget);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const existing = await getBudgetById(user.id, numId);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await deleteBudget(user.id, numId);
  return new NextResponse(null, { status: 204 });
}
