import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { applyRulesToTransactions } from "@/lib/queries/rules";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const applied = await applyRulesToTransactions(user.id);
    return NextResponse.json({ applied });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
