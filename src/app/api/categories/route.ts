import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAllCategories, createCategory } from "@/lib/queries/categories";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cats = await getAllCategories(user.id);
  return NextResponse.json(cats);
}

export async function POST(request: Request) {
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

  const { name, color, emoji } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!color || typeof color !== "string" || !HEX_RE.test(color)) {
    return NextResponse.json(
      { error: "color must be a valid 6-digit hex string (e.g. #e0af68)" },
      { status: 400 }
    );
  }
  if (emoji !== undefined && emoji !== null && typeof emoji !== "string") {
    return NextResponse.json({ error: "emoji must be a string" }, { status: 400 });
  }

  try {
    const cat = await createCategory(user.id, {
      name: name.trim(),
      color,
      emoji: typeof emoji === "string" ? emoji.trim() || null : null,
    });
    return NextResponse.json(cat, { status: 201 });
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
