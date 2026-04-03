import { NextResponse } from "next/server";
import { updateManualAsset, deleteManualAsset } from "@/lib/queries/manual-assets";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const { name, value, notes, emoji } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  }

  const asset = await updateManualAsset(
    numId,
    name.trim(),
    numValue.toFixed(2),
    notes?.trim() || undefined,
    emoji?.trim() || undefined
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
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  await deleteManualAsset(numId);
  return new NextResponse(null, { status: 204 });
}
