import { NextResponse } from "next/server";
import { addManualAssetSnapshot, getAllManualAssets } from "@/lib/queries/manual-assets";

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

  const { value, date } = body as Record<string, unknown>;

  const numValue = Number(value);
  if (!Number.isFinite(numValue)) {
    return NextResponse.json({ error: "value must be a number" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const assets = await getAllManualAssets();
  const exists = assets.some((a) => a.id === numId);
  if (!exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addManualAssetSnapshot(numId, numValue.toFixed(2), date);
  return new NextResponse(null, { status: 204 });
}
