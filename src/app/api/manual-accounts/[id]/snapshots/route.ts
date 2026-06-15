import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { addManualAccountSnapshot } from "@/lib/queries/manual-accounts";

export async function POST(
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

  const { balance, date } = body as Record<string, unknown>;

  const numBalance = Number(balance);
  if (!Number.isFinite(numBalance)) {
    return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const ok = await addManualAccountSnapshot(user.id, numId, numBalance.toFixed(2), date);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
