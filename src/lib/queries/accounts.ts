import { db } from "../db";
import { accounts, balanceSnapshots } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getAccountGroup } from "../utils/accounts";
import { toNumber } from "../utils/currency";
import { getAllManualAssets } from "./manual-assets";

export type AccountWithGroup = typeof accounts.$inferSelect & {
  group: "asset" | "liability" | "excluded";
};

export async function getAllAccounts(): Promise<AccountWithGroup[]> {
  const rows = await db
    .select()
    .from(accounts)
    .orderBy(accounts.connectionName, accounts.name);

  return rows.map((a) => ({
    ...a,
    group: getAccountGroup(a.type),
  }));
}

export async function getNetWorthSummary() {
  const allAccounts = await getAllAccounts();

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

  const manualAssetRows = await getAllManualAssets();
  for (const m of manualAssetRows) {
    assets += toNumber(m.value);
  }

  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}
