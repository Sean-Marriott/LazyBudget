import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";

export async function PUT(request: Request) {
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

  const { appToken, userToken } = body as Record<string, unknown>;

  if (!appToken || typeof appToken !== "string" || !appToken.trim()) {
    return NextResponse.json({ error: "appToken is required" }, { status: 400 });
  }
  if (!userToken || typeof userToken !== "string" || !userToken.trim()) {
    return NextResponse.json({ error: "userToken is required" }, { status: 400 });
  }

  const encryptedApp = encrypt(appToken.trim());
  const encryptedUser = encrypt(userToken.trim());

  await db
    .insert(userSettings)
    .values({
      userId: user.id,
      akahuAppToken: encryptedApp,
      akahuUserToken: encryptedUser,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        akahuAppToken: encryptedApp,
        akahuUserToken: encryptedUser,
        updatedAt: sql`now()`,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db
    .insert(userSettings)
    .values({ userId: user.id, akahuAppToken: null, akahuUserToken: null })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        akahuAppToken: null,
        akahuUserToken: null,
        updatedAt: sql`now()`,
      },
    });

  return new NextResponse(null, { status: 204 });
}
