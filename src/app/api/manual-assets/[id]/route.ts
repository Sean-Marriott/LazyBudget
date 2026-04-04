import { NextResponse } from "next/server";
import { updateManualAsset, deleteManualAsset } from "@/lib/queries/manual-assets";

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

  const { name, value, notes, emoji } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }
  if (emoji !== undefined && emoji !== null && typeof emoji !== "string") {
    return NextResponse.json({ error: "emoji must be a string" }, { status: 400 });
  }
  const numValue = Number(value);
  if (!Number.isFinite(numValue)) {
    return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  }

  const asset = await updateManualAsset(
    numId,
    name.trim(),
    numValue.toFixed(2),
    typeof notes === "string" ? notes.trim() || undefined : undefined,
    typeof emoji === "string" ? emoji.trim() || undefined : undefined
  );
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(asset);
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

  await deleteManualAsset(numId);
  return new NextResponse(null, { status: 204 });
}
