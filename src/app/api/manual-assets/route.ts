import { NextResponse } from "next/server";
import { getAllManualAssets, createManualAsset } from "@/lib/queries/manual-assets";

export async function GET() {
  const assets = await getAllManualAssets();
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, value, notes, emoji } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  }

  const asset = await createManualAsset(
    name.trim(),
    numValue.toFixed(2),
    notes?.trim() || undefined,
    emoji?.trim() || undefined
  );
  return NextResponse.json(asset, { status: 201 });
}
