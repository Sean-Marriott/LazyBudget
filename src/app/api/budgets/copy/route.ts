import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getLatestBudgetMonthBefore,
  copyBudgetsFromMonth,
} from "@/lib/queries/budgets";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

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

  const { month } = body as Record<string, unknown>;
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json(
      { error: "month is required in yyyy-MM format" },
      { status: 400 }
    );
  }

  const target = `${month}-01`;
  const source = await getLatestBudgetMonthBefore(user.id, target);
  if (!source) {
    return NextResponse.json(
      { error: "No earlier month with budgets to copy from" },
      { status: 404 }
    );
  }

  const copied = await copyBudgetsFromMonth(user.id, source, target);
  return NextResponse.json({ copied: copied.length, from: source });
}
