import { db } from "../db";
import { transactions, accounts } from "../db/schema";
import { eq, desc, and, gte, lte, sql, or, ilike } from "drizzle-orm";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toNumber } from "../utils/currency";

export async function getRecentTransactions(limit = 10) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      accountId: transactions.accountId,
      accountName: accounts.name,
      merchantName: transactions.merchantName,
      akahuCategoryGroup: transactions.akahuCategoryGroup,
      userCategory: transactions.userCategory,
      isTransfer: transactions.isTransfer,
      isHidden: transactions.isHidden,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.isHidden, false),
        eq(transactions.isTransfer, false)
      )
    )
    .orderBy(desc(transactions.date))
    .limit(limit);
}

export async function getMonthlySpendingByCategory(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const rows = await db
    .select({
      category: sql<string>`COALESCE(${transactions.userCategory}, ${transactions.akahuCategoryGroup}, 'Uncategorised')`,
      total: sql<string>`SUM(${transactions.amount})`,
      count: sql<string>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, start),
        lte(transactions.date, end),
        eq(transactions.isHidden, false),
        eq(transactions.isTransfer, false),
        sql`${transactions.amount} < 0` // only expenses
      )
    )
    .groupBy(sql`COALESCE(${transactions.userCategory}, ${transactions.akahuCategoryGroup}, 'Uncategorised')`)
    .orderBy(sql`SUM(${transactions.amount}) ASC`); // most negative first

  return rows.map((r) => ({
    category: r.category,
    total: Math.abs(toNumber(r.total)),
    count: Number(r.count),
  }));
}

export async function getTransactions(opts: {
  monthStart: Date;
  monthEnd: Date;
  category?: string;
  search?: string;
}) {
  const { monthStart, monthEnd, category, search } = opts;

  const conditions = [
    gte(transactions.date, monthStart),
    lte(transactions.date, monthEnd),
    eq(transactions.isHidden, false),
  ];

  if (category) {
    conditions.push(
      sql`COALESCE(${transactions.userCategory}, ${transactions.akahuCategoryGroup}, 'Uncategorised') = ${category}`
    );
  }

  if (search) {
    conditions.push(
      or(
        ilike(transactions.description, `%${search}%`),
        ilike(transactions.merchantName, `%${search}%`)
      )!
    );
  }

  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      accountId: transactions.accountId,
      accountName: accounts.name,
      merchantName: transactions.merchantName,
      akahuCategoryGroup: transactions.akahuCategoryGroup,
      userCategory: transactions.userCategory,
      notes: transactions.notes,
      isTransfer: transactions.isTransfer,
      isHidden: transactions.isHidden,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date));
}

export async function updateTransaction(
  id: string,
  data: {
    userCategory?: string | null;
    notes?: string | null;
    isTransfer?: boolean;
    isHidden?: boolean;
  }
): Promise<void> {
  await db.update(transactions).set(data).where(eq(transactions.id, id));
}

export async function getMonthSummary(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const rows = await db
    .select({
      income: sql<string>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
      expenses: sql<string>`SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, start),
        lte(transactions.date, end),
        eq(transactions.isHidden, false),
        eq(transactions.isTransfer, false)
      )
    );

  const income = toNumber(rows[0]?.income);
  const expenses = Math.abs(toNumber(rows[0]?.expenses));
  return { income, expenses, net: income - expenses };
}
