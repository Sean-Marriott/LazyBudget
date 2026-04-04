import { db } from "../db";
import { transactionRules, transactions } from "../db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import { updateTransaction } from "./transactions";

export type TransactionRule = typeof transactionRules.$inferSelect;

export type RuleInput = {
  name: string;
  enabled?: boolean;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  setCategory?: string | null;
  setNotes?: string | null;
  setTransfer?: boolean | null;
  setHidden?: boolean | null;
};

export async function getAllRules(): Promise<TransactionRule[]> {
  return db.select().from(transactionRules).orderBy(asc(transactionRules.id));
}

export async function createRule(data: RuleInput): Promise<TransactionRule> {
  const [rule] = await db.insert(transactionRules).values(data).returning();
  return rule;
}

export async function updateRule(
  id: number,
  data: Partial<RuleInput>
): Promise<TransactionRule | null> {
  const [rule] = await db
    .update(transactionRules)
    .set(data)
    .where(eq(transactionRules.id, id))
    .returning();
  return rule ?? null;
}

export async function deleteRule(id: number): Promise<void> {
  await db.delete(transactionRules).where(eq(transactionRules.id, id));
}

function matchesRule(
  tx: { description: string; merchantName: string | null },
  rule: TransactionRule
): boolean {
  const haystack =
    (rule.conditionField === "merchantName" ? tx.merchantName : tx.description) ?? "";
  const needle = rule.conditionValue;
  switch (rule.conditionOperator) {
    case "contains":
      return haystack.toLowerCase().includes(needle.toLowerCase());
    case "equals":
      return haystack.toLowerCase() === needle.toLowerCase();
    case "starts_with":
      return haystack.toLowerCase().startsWith(needle.toLowerCase());
    default:
      return false;
  }
}

export async function applyRulesToTransactions(): Promise<number> {
  const rules = await db
    .select()
    .from(transactionRules)
    .where(eq(transactionRules.enabled, true))
    .orderBy(asc(transactionRules.id));

  if (rules.length === 0) return 0;

  const uncategorized = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      merchantName: transactions.merchantName,
    })
    .from(transactions)
    .where(isNull(transactions.userCategory));

  let applied = 0;

  for (const tx of uncategorized) {
    for (const rule of rules) {
      if (matchesRule(tx, rule)) {
        const update: {
          userCategory?: string | null;
          notes?: string | null;
          isTransfer?: boolean;
          isHidden?: boolean;
        } = {};

        if (rule.setCategory !== null && rule.setCategory !== undefined) {
          update.userCategory = rule.setCategory;
        }
        if (rule.setNotes !== null && rule.setNotes !== undefined) {
          update.notes = rule.setNotes;
        }
        if (rule.setTransfer !== null && rule.setTransfer !== undefined) {
          update.isTransfer = rule.setTransfer;
        }
        if (rule.setHidden !== null && rule.setHidden !== undefined) {
          update.isHidden = rule.setHidden;
        }

        if (Object.keys(update).length > 0) {
          await updateTransaction(tx.id, update);
          applied++;
        }
        break; // first match wins
      }
    }
  }

  return applied;
}
