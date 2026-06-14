import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { runSync, canSync } from "@/lib/akahu/sync";
import { AkahuNotConfiguredError } from "@/lib/akahu/client";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "full" ? "full" : "incremental";

  // Enforce the per-user cooldown for all modes — a full sync is the more
  // expensive operation, so it must not be a way to bypass the rate limit.
  const { allowed, nextAllowedAt, lastSyncAt } = await canSync(user.id);
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

  try {
    const result = await runSync(user.id, mode);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AkahuNotConfiguredError) {
      return NextResponse.json(
        { error: "akahu_not_configured" },
        { status: 409 }
      );
    }
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
