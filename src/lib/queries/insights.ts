import { db } from "@/lib/db";
import {
  accounts,
  balanceSnapshots,
  transactions,
  manualAccounts,
  manualAccountSnapshots,
  manualAssets,
  manualAssetSnapshots,
} from "@/lib/db/schema";
import { eq, gte, asc, and, sql } from "drizzle-orm";
import { subDays, format, subMonths, startOfMonth } from "date-fns";
import { getAccountGroup } from "@/lib/utils/accounts";
import { toNumber } from "@/lib/utils/currency";

export type AccountBalanceHistory = {
  id: string;
  name: string;
  type: string;
  group: "asset" | "liability";
  isManual: boolean;
  currentValue: number;
  snapshots: Array<{ date: string; balance: number }>;
};

// ---------------------------------------------------------------------------
// Net worth history — combines Akahu + manual accounts + manual assets
// ---------------------------------------------------------------------------
export async function getNetWorthHistory(
  days: number
): Promise<Array<{ date: string; netWorth: number }>> {
  const cutoffStr = format(subDays(new Date(), days), "yyyy-MM-dd");

  const [akahuSnaps, manualAcctSnaps, manualAssetSnaps] = await Promise.all([
    db
      .select({
        date: balanceSnapshots.snapshotDate,
        balance: balanceSnapshots.balance,
        type: accounts.type,
        status: accounts.status,
      })
      .from(balanceSnapshots)
      .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
      .where(gte(balanceSnapshots.snapshotDate, cutoffStr))
      .orderBy(asc(balanceSnapshots.snapshotDate)),

    // All manual account snapshots (no date filter — needed for forward-fill before cutoff)
    db
      .select({
        manualAccountId: manualAccountSnapshots.manualAccountId,
        date: manualAccountSnapshots.snapshotDate,
        balance: manualAccountSnapshots.balance,
        type: manualAccounts.type,
      })
      .from(manualAccountSnapshots)
      .innerJoin(manualAccounts, eq(manualAccountSnapshots.manualAccountId, manualAccounts.id))
      .orderBy(asc(manualAccountSnapshots.snapshotDate)),

    // All manual asset snapshots (no date filter — needed for forward-fill)
    db
      .select({
        manualAssetId: manualAssetSnapshots.manualAssetId,
        date: manualAssetSnapshots.snapshotDate,
        value: manualAssetSnapshots.value,
      })
      .from(manualAssetSnapshots)
      .orderBy(asc(manualAssetSnapshots.snapshotDate)),
  ]);

  // Group Akahu snapshots by date
  const akahuByDate = new Map<string, Array<{ balance: number; type: string }>>();
  for (const row of akahuSnaps) {
    if (row.status !== "ACTIVE") continue;
    if (getAccountGroup(row.type) === "excluded") continue;
    if (!akahuByDate.has(row.date)) akahuByDate.set(row.date, []);
    akahuByDate.get(row.date)!.push({ balance: toNumber(row.balance), type: row.type });
  }

  const allDates = Array.from(akahuByDate.keys()).sort();
  if (allDates.length === 0) return [];

  // Forward-fill manual values as we iterate sorted dates
  const manualAcctLast = new Map<number, { balance: number; type: string }>();
  const manualAssetLast = new Map<number, number>();
  let acctIdx = 0;
  let assetIdx = 0;

  return allDates.map((date) => {
    while (acctIdx < manualAcctSnaps.length && manualAcctSnaps[acctIdx].date <= date) {
      const s = manualAcctSnaps[acctIdx];
      manualAcctLast.set(s.manualAccountId, { balance: toNumber(s.balance), type: s.type });
      acctIdx++;
    }
    while (assetIdx < manualAssetSnaps.length && manualAssetSnaps[assetIdx].date <= date) {
      const s = manualAssetSnaps[assetIdx];
      manualAssetLast.set(s.manualAssetId, toNumber(s.value));
      assetIdx++;
    }

    let netWorth = 0;
    for (const { balance, type } of akahuByDate.get(date) ?? []) {
      const group = getAccountGroup(type);
      if (group === "asset") netWorth += balance;
      else if (group === "liability") netWorth += Math.min(balance, 0);
    }
    for (const { balance, type } of manualAcctLast.values()) {
      const group = getAccountGroup(type);
      if (group === "asset") netWorth += balance;
      else if (group === "liability") netWorth += Math.min(balance, 0);
    }
    for (const value of manualAssetLast.values()) {
      netWorth += value;
    }

    return { date, netWorth };
  });
}

// ---------------------------------------------------------------------------
// Per-account balance histories
// ---------------------------------------------------------------------------
export async function getAccountBalanceHistories(
  days: number
): Promise<AccountBalanceHistory[]> {
  const cutoffStr = format(subDays(new Date(), days), "yyyy-MM-dd");

  const [akahuAccounts, akahuSnaps, manualAccountRows, manualAcctSnaps, manualAssetRows, manualAssetSnaps] =
    await Promise.all([
      db
        .select()
        .from(accounts)
        .where(eq(accounts.status, "ACTIVE"))
        .orderBy(accounts.name),

      db
        .select({
          accountId: balanceSnapshots.accountId,
          date: balanceSnapshots.snapshotDate,
          balance: balanceSnapshots.balance,
        })
        .from(balanceSnapshots)
        .innerJoin(accounts, eq(balanceSnapshots.accountId, accounts.id))
        .where(
          and(
            gte(balanceSnapshots.snapshotDate, cutoffStr),
            eq(accounts.status, "ACTIVE")
          )
        )
        .orderBy(asc(balanceSnapshots.snapshotDate)),

      db.select().from(manualAccounts).orderBy(asc(manualAccounts.name)),

      db
        .select({
          manualAccountId: manualAccountSnapshots.manualAccountId,
          date: manualAccountSnapshots.snapshotDate,
          balance: manualAccountSnapshots.balance,
        })
        .from(manualAccountSnapshots)
        .where(gte(manualAccountSnapshots.snapshotDate, cutoffStr))
        .orderBy(asc(manualAccountSnapshots.snapshotDate)),

      db.select().from(manualAssets).orderBy(asc(manualAssets.name)),

      db
        .select({
          manualAssetId: manualAssetSnapshots.manualAssetId,
          date: manualAssetSnapshots.snapshotDate,
          value: manualAssetSnapshots.value,
        })
        .from(manualAssetSnapshots)
        .where(gte(manualAssetSnapshots.snapshotDate, cutoffStr))
        .orderBy(asc(manualAssetSnapshots.snapshotDate)),
    ]);

  const result: AccountBalanceHistory[] = [];

  // Akahu accounts
  const snapsByAccount = new Map<string, Array<{ date: string; balance: number }>>();
  for (const s of akahuSnaps) {
    if (!snapsByAccount.has(s.accountId)) snapsByAccount.set(s.accountId, []);
    snapsByAccount.get(s.accountId)!.push({ date: s.date, balance: toNumber(s.balance) });
  }
  for (const acc of akahuAccounts) {
    const group = getAccountGroup(acc.type);
    if (group === "excluded") continue;
    result.push({
      id: `akahu-${acc.id}`,
      name: acc.name,
      type: acc.type,
      group: group as "asset" | "liability",
      isManual: false,
      currentValue: toNumber(acc.balance),
      snapshots: snapsByAccount.get(acc.id) ?? [],
    });
  }

  // Manual accounts
  const manualAcctSnapMap = new Map<number, Array<{ date: string; balance: number }>>();
  for (const s of manualAcctSnaps) {
    if (!manualAcctSnapMap.has(s.manualAccountId)) manualAcctSnapMap.set(s.manualAccountId, []);
    manualAcctSnapMap.get(s.manualAccountId)!.push({ date: s.date, balance: toNumber(s.balance) });
  }
  for (const acc of manualAccountRows) {
    const group = getAccountGroup(acc.type);
    result.push({
      id: `manual-acct-${acc.id}`,
      name: acc.name,
      type: acc.type,
      group: group as "asset" | "liability",
      isManual: true,
      currentValue: toNumber(acc.balance),
      snapshots: manualAcctSnapMap.get(acc.id) ?? [],
    });
  }

  // Manual assets
  const manualAssetSnapMap = new Map<number, Array<{ date: string; balance: number }>>();
  for (const s of manualAssetSnaps) {
    if (!manualAssetSnapMap.has(s.manualAssetId)) manualAssetSnapMap.set(s.manualAssetId, []);
    manualAssetSnapMap.get(s.manualAssetId)!.push({ date: s.date, balance: toNumber(s.value) });
  }
  for (const asset of manualAssetRows) {
    result.push({
      id: `manual-asset-${asset.id}`,
      name: asset.name,
      type: "ASSET",
      group: "asset",
      isManual: true,
      currentValue: toNumber(asset.value),
      snapshots: manualAssetSnapMap.get(asset.id) ?? [],
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Monthly income / spending / net trends
// ---------------------------------------------------------------------------
export async function getMonthlyTrends(months: number): Promise<
  Array<{ month: string; income: number; spending: number; net: number }>
> {
  const cutoff = startOfMonth(subMonths(new Date(), months - 1));

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${transactions.date})::date`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount}::numeric > 0 THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
      spending: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.amount}::numeric < 0 THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, cutoff),
        eq(transactions.isTransfer, false),
        eq(transactions.isHidden, false)
      )
    )
    .groupBy(sql`date_trunc('month', ${transactions.date})`)
    .orderBy(sql`date_trunc('month', ${transactions.date})`);

  return rows.map((r) => {
    const income = toNumber(r.income);
    const spending = Math.abs(toNumber(r.spending));
    return {
      month: r.month,
      income,
      spending,
      net: income - spending,
    };
  });
}

// ---------------------------------------------------------------------------
// Monthly spending by top-5 categories
// ---------------------------------------------------------------------------
export async function getMonthlyCategoryTrends(months: number): Promise<{
  categories: string[];
  data: Array<Record<string, string | number>>;
}> {
  const cutoff = startOfMonth(subMonths(new Date(), months - 1));

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${transactions.date})::date`,
      category: sql<string>`COALESCE(${transactions.userCategory}, ${transactions.akahuCategoryGroup}, 'Uncategorised')`,
      total: sql<string>`SUM(ABS(${transactions.amount}::numeric))`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, cutoff),
        sql`${transactions.amount}::numeric < 0`,
        eq(transactions.isTransfer, false),
        eq(transactions.isHidden, false)
      )
    )
    .groupBy(
      sql`date_trunc('month', ${transactions.date})`,
      sql`COALESCE(${transactions.userCategory}, ${transactions.akahuCategoryGroup}, 'Uncategorised')`
    )
    .orderBy(sql`date_trunc('month', ${transactions.date})`);

  // Find top 5 categories by total spend across all months
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.category, (totals.get(r.category) ?? 0) + toNumber(r.total));
  }
  const top5 = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  // Pivot: { month, [category]: amount }
  const byMonth = new Map<string, Record<string, string | number>>();
  for (const r of rows) {
    if (!top5.includes(r.category)) continue;
    if (!byMonth.has(r.month)) byMonth.set(r.month, { month: r.month });
    byMonth.get(r.month)![r.category] = toNumber(r.total);
  }

  return {
    categories: top5,
    data: Array.from(byMonth.values()).sort((a, b) =>
      String(a.month).localeCompare(String(b.month))
    ),
  };
}
