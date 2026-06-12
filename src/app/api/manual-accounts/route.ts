import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAllManualAccounts, createManualAccount } from "@/lib/queries/manual-accounts";
import { MANUAL_ACCOUNT_TYPES } from "@/lib/utils/accounts";

const ALLOWED_TYPES = new Set<string>(MANUAL_ACCOUNT_TYPES);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accounts = await getAllManualAccounts(user.id);
  return NextResponse.json(accounts);
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

  const { name, type, balance, notes } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!type || typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "invalid account type" }, { status: 400 });
  }
  const numBalance = Number(balance);
  if (!Number.isFinite(numBalance)) {
    return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }

  const account = await createManualAccount(
    user.id,
    name.trim(),
    type,
    numBalance.toFixed(2),
    typeof notes === "string" ? notes.trim() || undefined : undefined
  );
  return NextResponse.json(account, { status: 201 });
}
