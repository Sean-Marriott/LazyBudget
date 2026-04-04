import { NextResponse } from "next/server";
import { updateTransaction } from "@/lib/queries/transactions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (Array.isArray(body) || typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { userCategory, notes, isTransfer, isHidden } = body as Record<string, unknown>;

  if (
    userCategory !== undefined &&
    userCategory !== null &&
    typeof userCategory !== "string"
  ) {
    return NextResponse.json({ error: "userCategory must be a string or null" }, { status: 400 });
  }
  if (
    notes !== undefined &&
    notes !== null &&
    typeof notes !== "string"
  ) {
    return NextResponse.json({ error: "notes must be a string or null" }, { status: 400 });
  }
  if (isTransfer !== undefined && typeof isTransfer !== "boolean") {
    return NextResponse.json({ error: "isTransfer must be a boolean" }, { status: 400 });
  }
  if (isHidden !== undefined && typeof isHidden !== "boolean") {
    return NextResponse.json({ error: "isHidden must be a boolean" }, { status: 400 });
  }

  const data: {
    userCategory?: string | null;
    notes?: string | null;
    isTransfer?: boolean;
    isHidden?: boolean;
  } = {};

  if (userCategory !== undefined) data.userCategory = (userCategory as string | null) || null;
  if (notes !== undefined) data.notes = (notes as string | null) || null;
  if (isTransfer !== undefined) data.isTransfer = isTransfer as boolean;
  if (isHidden !== undefined) data.isHidden = isHidden as boolean;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no valid fields provided" }, { status: 400 });
  }

  await updateTransaction(id.trim(), data);
  return NextResponse.json({ ok: true });
}
