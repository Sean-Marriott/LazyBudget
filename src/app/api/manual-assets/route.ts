import { NextResponse } from "next/server";
import { getAllManualAssets, createManualAsset } from "@/lib/queries/manual-assets";

export async function GET() {
  const assets = await getAllManualAssets();
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
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

  const asset = await createManualAsset(
    name.trim(),
    numValue.toFixed(2),
    typeof notes === "string" ? notes.trim() || undefined : undefined,
    typeof emoji === "string" ? emoji.trim() || undefined : undefined
  );
  return NextResponse.json(asset, { status: 201 });
}
