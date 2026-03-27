import { NextResponse } from "next/server";
import { getAllAccounts } from "@/lib/queries/accounts";

export async function GET() {
  try {
    const data = await getAllAccounts();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}
