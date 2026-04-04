import { NextResponse } from "next/server";
import { applyRulesToTransactions } from "@/lib/queries/rules";

export async function POST() {
  const applied = await applyRulesToTransactions();
  return NextResponse.json({ applied });
}
