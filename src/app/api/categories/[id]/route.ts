import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getCategoryById,
  deleteCategory,
} from "@/lib/queries/categories";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

  const { name, color, emoji } = body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
  }
  if (color !== undefined && (typeof color !== "string" || !HEX_RE.test(color))) {
    return NextResponse.json(
      { error: "color must be a valid 6-digit hex string (e.g. #e0af68)" },
      { status: 400 }
    );
  }
  if (emoji !== undefined && emoji !== null && typeof emoji !== "string") {
    return NextResponse.json({ error: "emoji must be a string" }, { status: 400 });
  }
  if (typeof emoji === "string" && emoji.trim().length > 8) {
    return NextResponse.json({ error: "emoji must be at most 8 characters" }, { status: 400 });
  }

  const existing = await getCategoryById(numId);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const data: Record<string, string | null | undefined> = {};
  if (name !== undefined) data.name = (name as string).trim();
  if (color !== undefined) data.color = color as string;
  if (emoji !== undefined) {
    data.emoji = typeof emoji === "string" ? emoji.trim() || null : null;
  }

  try {
    const cat = await db.transaction(async (tx) => {
      // Cascade rename: update userCategory on affected transactions atomically
      if (data.name && data.name !== existing.name) {
        await tx
          .update(transactions)
          .set({ userCategory: data.name })
          .where(eq(transactions.userCategory, existing.name));
      }

      const [updated] = await tx
        .update(categories)
        .set(data)
        .where(eq(categories.id, numId))
        .returning();
      return updated ?? null;
    });

    if (!cat) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(cat);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A category with that name already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
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

  const existing = await getCategoryById(numId);
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await deleteCategory(numId);
  return new NextResponse(null, { status: 204 });
}
