import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAllAccounts } from "@/lib/queries/accounts";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await getAllAccounts(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
