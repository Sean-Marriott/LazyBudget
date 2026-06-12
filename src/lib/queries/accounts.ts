import { db } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { getAccountGroup } from "../utils/accounts";
import { toNumber } from "../utils/currency";
import { getAllManualAssets } from "@/lib/queries/manual-assets";
import { getAllManualAccounts } from "@/lib/queries/manual-accounts";

export type AccountWithGroup = typeof accounts.$inferSelect & {
  group: "asset" | "liability" | "excluded";
};

export async function getAllAccounts(
  userId: string
): Promise<AccountWithGroup[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.connectionName, accounts.name);

  return rows.map((a) => ({
    ...a,
    group: getAccountGroup(a.type),
  }));
}

export async function getNetWorthSummary(userId: string) {
  const allAccounts = await getAllAccounts(userId);

  let assets = 0;
  let liabilities = 0;

  for (const acc of allAccounts) {
    if (acc.status !== "ACTIVE") continue;
    const bal = toNumber(acc.balance);
    if (acc.group === "asset") {
      assets += bal;
    } else if (acc.group === "liability") {
      // Liabilities are typically negative balances (e.g. credit card debt)
      liabilities += Math.abs(Math.min(bal, 0));
    }
  }

  const manualAssetRows = await getAllManualAssets(userId);
  for (const m of manualAssetRows) {
    assets += toNumber(m.value);
  }

  const manualAccountRows = await getAllManualAccounts(userId);
  for (const acc of manualAccountRows) {
    const bal = toNumber(acc.balance);
    if (acc.group === "asset") {
      assets += bal;
    } else if (acc.group === "liability") {
      liabilities += Math.abs(Math.min(bal, 0));
    }
  }

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}
