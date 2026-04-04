import { NextResponse } from "next/server";
import { applyRulesToTransactions } from "@/lib/queries/rules";

export async function POST() {
  try {
    const applied = await applyRulesToTransactions();
    return NextResponse.json({ applied });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
