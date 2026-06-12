import { db } from "../db";
import { transactionRules, transactions } from "../db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { updateTransaction } from "./transactions";
import type { RuleCondition } from "../utils/rules";

export type TransactionRule = typeof transactionRules.$inferSelect;

export type RuleInput = {
  name: string;
  enabled?: boolean;
  conditionCombinator?: string;
  conditions: RuleCondition[];
  setCategory?: string | null;
  setNotes?: string | null;
  setTransfer?: boolean | null;
  setHidden?: boolean | null;
};

export async function getAllRules(userId: string): Promise<TransactionRule[]> {
  return db
    .select()
    .from(transactionRules)
    .where(eq(transactionRules.userId, userId))
    .orderBy(asc(transactionRules.id));
}

export async function createRule(
  userId: string,
  data: RuleInput
): Promise<TransactionRule> {
  const [rule] = await db
    .insert(transactionRules)
    .values({ ...data, userId })
    .returning();
  return rule;
}

export async function updateRule(
  userId: string,
  id: number,
  data: Partial<RuleInput>
): Promise<TransactionRule | null> {
  const [rule] = await db
    .update(transactionRules)
    .set(data)
    .where(and(eq(transactionRules.userId, userId), eq(transactionRules.id, id)))
    .returning();
  return rule ?? null;
}

export async function deleteRule(userId: string, id: number): Promise<void> {
  await db
    .delete(transactionRules)
    .where(and(eq(transactionRules.userId, userId), eq(transactionRules.id, id)));
}

export async function getRuleById(
  userId: string,
  id: number
): Promise<TransactionRule | null> {
  const [rule] = await db
    .select()
    .from(transactionRules)
    .where(and(eq(transactionRules.userId, userId), eq(transactionRules.id, id)));
  return rule ?? null;
}

function matchesCondition(
  tx: { description: string; merchantName: string | null },
  condition: RuleCondition
): boolean {
  const haystack =
    (condition.field === "merchantName" ? tx.merchantName : tx.description) ?? "";
  const needle = condition.value;
  switch (condition.operator) {
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

function matchesRule(
  tx: { description: string; merchantName: string | null },
  rule: TransactionRule
): boolean {
  if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) return false;
  if (rule.conditionCombinator === "OR") {
    return rule.conditions.some((c) => matchesCondition(tx, c));
  }
  // AND (default)
  return rule.conditions.every((c) => matchesCondition(tx, c));
}

export async function applyRulesToTransactions(userId: string): Promise<number> {
  const rules = await db
    .select()
    .from(transactionRules)
    .where(
      and(eq(transactionRules.userId, userId), eq(transactionRules.enabled, true))
    )
    .orderBy(asc(transactionRules.id));

  if (rules.length === 0) return 0;

  const uncategorized = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      merchantName: transactions.merchantName,
      notes: transactions.notes,
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), isNull(transactions.userCategory))
    );

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
        if (rule.setNotes !== null && rule.setNotes !== undefined && tx.notes == null) {
          update.notes = rule.setNotes;
        }
        if (rule.setTransfer !== null && rule.setTransfer !== undefined) {
          update.isTransfer = rule.setTransfer;
        }
        if (rule.setHidden !== null && rule.setHidden !== undefined) {
          update.isHidden = rule.setHidden;
        }

        if (Object.keys(update).length > 0) {
          await updateTransaction(userId, tx.id, update);
          applied++;
        }
        break; // first match wins
      }
    }
  }

  return applied;
}
