import { NextRequest, NextResponse } from "next/server";
import { runSync, canSync } from "@/lib/akahu/sync";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "full" ? "full" : "incremental";

  // Check cooldown unless forced full sync
  if (mode === "incremental") {
    const { allowed, nextAllowedAt, lastSyncAt } = await canSync();
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Sync cooldown active",
          nextAllowedAt: nextAllowedAt?.toISOString(),
          lastSyncAt: lastSyncAt?.toISOString(),
        },
        { status: 429 }
      );
    }
  }

  try {
    const result = await runSync(mode);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
