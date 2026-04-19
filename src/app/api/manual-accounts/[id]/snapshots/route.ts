import { NextResponse } from "next/server";
import { addManualAccountSnapshot, getAllManualAccounts } from "@/lib/queries/manual-accounts";

export async function POST(
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

  const { balance, date } = body as Record<string, unknown>;

  const numBalance = Number(balance);
  if (!Number.isFinite(numBalance)) {
    return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const accounts = await getAllManualAccounts();
  const exists = accounts.some((a) => a.id === numId);
  if (!exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addManualAccountSnapshot(numId, numBalance.toFixed(2), date);
  return new NextResponse(null, { status: 204 });
}
