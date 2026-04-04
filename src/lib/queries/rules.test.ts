import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist all mock functions so they can be referenced inside vi.mock factories
// ---------------------------------------------------------------------------
const {
  mockUpdateTransaction,
  mockOrderBy,
  mockRulesWhere,
  mockUncatWhere,
  mockFrom,
  mockSelect,
  callState,
} = vi.hoisted(() => {
  const mockUpdateTransaction = vi.fn().mockResolvedValue(undefined);

  const mockOrderBy = vi.fn().mockResolvedValue([]);
  const mockRulesWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockUncatWhere = vi.fn().mockResolvedValue([]);

  // applyRulesToTransactions calls db.select() twice:
  //   1st: .from(transactionRules).where(...).orderBy(...)  → resolves at orderBy
  //   2nd: .from(transactions).where(...)                   → resolves at where
  const callState = { fromCallCount: 0 };
  const mockFrom = vi.fn().mockImplementation(() => {
    callState.fromCallCount++;
    return callState.fromCallCount === 1
      ? { where: mockRulesWhere }
      : { where: mockUncatWhere };
  });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockUpdateTransaction,
    mockOrderBy,
    mockRulesWhere,
    mockUncatWhere,
    mockFrom,
    mockSelect,
    callState,
  };
});

vi.mock("@/lib/queries/transactions", () => ({
  updateTransaction: mockUpdateTransaction,
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((...args) => ({ op: "eq", args })),
    isNull: vi.fn((col) => ({ op: "isNull", col })),
    asc: vi.fn((col) => ({ op: "asc", col })),
  };
});

vi.mock("@/lib/db/schema", () => ({
  transactionRules: new Proxy(
    {},
    { get: (_t, prop) => `transactionRules.${String(prop)}` }
  ),
  transactions: new Proxy(
    {},
    { get: (_t, prop) => `transactions.${String(prop)}` }
  ),
}));

import { applyRulesToTransactions } from "./rules";
import type { TransactionRule } from "./rules";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<TransactionRule> = {}): TransactionRule {
  return {
    id: 1,
    name: "Test Rule",
    enabled: true,
    conditionCombinator: "AND",
    conditions: [{ field: "description", operator: "contains", value: "coffee" }],
    setCategory: "Eating Out",
    setNotes: null,
    setTransfer: null,
    setHidden: null,
    createdAt: new Date(),
    ...overrides,
  } as TransactionRule;
}

function makeTx(overrides: Partial<{ id: string; description: string; merchantName: string | null }> = {}) {
  return { id: "tx_1", description: "Coffee shop", merchantName: null, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  callState.fromCallCount = 0;

  // Re-establish chain after clearAllMocks wipes call history but not implementations.
  // The implementations are re-set here to be safe.
  mockOrderBy.mockResolvedValue([]);
  mockRulesWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockUncatWhere.mockResolvedValue([]);
  mockFrom.mockImplementation(() => {
    callState.fromCallCount++;
    return callState.fromCallCount === 1
      ? { where: mockRulesWhere }
      : { where: mockUncatWhere };
  });
  mockSelect.mockReturnValue({ from: mockFrom });
  mockUpdateTransaction.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// applyRulesToTransactions — high-level behaviour
// ---------------------------------------------------------------------------

describe("applyRulesToTransactions", () => {
  it("returns 0 and skips uncategorised query when no enabled rules exist", async () => {
    mockOrderBy.mockResolvedValueOnce([]); // no rules
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
    // The second select (uncategorised) should never be called
    expect(callState.fromCallCount).toBe(1);
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it("returns 0 when rules exist but no uncategorised transactions", async () => {
    mockOrderBy.mockResolvedValueOnce([makeRule()]);
    mockUncatWhere.mockResolvedValueOnce([]); // no transactions
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it("applies setCategory from a matching rule", async () => {
    mockOrderBy.mockResolvedValueOnce([makeRule({ setCategory: "Groceries" })]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Coffee" })]);

    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { userCategory: "Groceries" });
  });

  it("applies setNotes from a matching rule", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ setCategory: null, setNotes: "Auto-tagged" }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Coffee" })]);

    await applyRulesToTransactions();
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { notes: "Auto-tagged" });
  });

  it("applies setTransfer from a matching rule", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ setCategory: null, setTransfer: true }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Coffee" })]);

    await applyRulesToTransactions();
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { isTransfer: true });
  });

  it("applies setHidden from a matching rule", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ setCategory: null, setHidden: true }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Coffee" })]);

    await applyRulesToTransactions();
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { isHidden: true });
  });

  it("skips update when rule has no action fields set", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ setCategory: null, setNotes: null, setTransfer: null, setHidden: null }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx()]);

    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it("returns count equal to number of transactions matched and updated", async () => {
    const rule = makeRule({ setCategory: "Transport" });
    mockOrderBy.mockResolvedValueOnce([rule]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ id: "tx_1", description: "Coffee" }),
      makeTx({ id: "tx_2", description: "Another coffee run" }),
      makeTx({ id: "tx_3", description: "Supermarket" }), // won't match
    ]);

    const result = await applyRulesToTransactions();
    expect(result).toBe(2);
    expect(mockUpdateTransaction).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // First-match-wins
  // -------------------------------------------------------------------------

  it("stops at the first matching rule and does not apply subsequent rules", async () => {
    const rule1 = makeRule({ id: 1, setCategory: "Eating Out" });
    const rule2 = makeRule({ id: 2, setCategory: "Groceries" });
    mockOrderBy.mockResolvedValueOnce([rule1, rule2]);
    mockUncatWhere.mockResolvedValueOnce([makeTx()]);

    await applyRulesToTransactions();
    expect(mockUpdateTransaction).toHaveBeenCalledOnce();
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { userCategory: "Eating Out" });
  });

  it("falls through to the second rule when the first does not match", async () => {
    const rule1 = makeRule({
      id: 1,
      conditions: [{ field: "description", operator: "contains", value: "supermarket" }],
      setCategory: "Groceries",
    });
    const rule2 = makeRule({
      id: 2,
      conditions: [{ field: "description", operator: "contains", value: "coffee" }],
      setCategory: "Eating Out",
    });
    mockOrderBy.mockResolvedValueOnce([rule1, rule2]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Coffee shop" })]);

    await applyRulesToTransactions();
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { userCategory: "Eating Out" });
  });
});

// ---------------------------------------------------------------------------
// matchesCondition — tested indirectly via applyRulesToTransactions
// ---------------------------------------------------------------------------

describe("condition: contains operator", () => {
  it("matches when description contains value (case-insensitive)", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "contains", value: "COFFEE" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "morning coffee stop" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match when description does not contain value", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "contains", value: "coffee" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Countdown supermarket" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

describe("condition: equals operator", () => {
  it("matches when description equals value exactly (case-insensitive)", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "equals", value: "Netflix" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "netflix" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match when description only partially equals value", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "equals", value: "Netflix" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Netflix monthly" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

describe("condition: starts_with operator", () => {
  it("matches when description starts with value (case-insensitive)", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "starts_with", value: "PAY" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Paywave purchase" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match when description does not start with value", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({ conditions: [{ field: "description", operator: "starts_with", value: "pay" }] }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Monthly payment" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

describe("condition: merchantName field", () => {
  it("matches merchantName when field is 'merchantName'", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditions: [{ field: "merchantName", operator: "contains", value: "countdown" }],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ description: "irrelevant", merchantName: "Countdown Supermarket" }),
    ]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match description when field is 'merchantName'", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditions: [{ field: "merchantName", operator: "contains", value: "countdown" }],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ description: "countdown", merchantName: "Different Store" }),
    ]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });

  it("does not match when merchantName is null", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditions: [{ field: "merchantName", operator: "contains", value: "anything" }],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ merchantName: null })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// matchesRule — AND / OR combinators
// ---------------------------------------------------------------------------

describe("AND combinator", () => {
  it("matches only when all conditions are satisfied", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditionCombinator: "AND",
        conditions: [
          { field: "description", operator: "contains", value: "coffee" },
          { field: "merchantName", operator: "contains", value: "brew" },
        ],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ description: "coffee latte", merchantName: "Brew Lab" }),
    ]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match when only one of two AND conditions is satisfied", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditionCombinator: "AND",
        conditions: [
          { field: "description", operator: "contains", value: "coffee" },
          { field: "merchantName", operator: "contains", value: "brew" },
        ],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ description: "coffee latte", merchantName: "Other Cafe" }),
    ]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

describe("OR combinator", () => {
  it("matches when any single condition is satisfied", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditionCombinator: "OR",
        conditions: [
          { field: "description", operator: "contains", value: "coffee" },
          { field: "description", operator: "contains", value: "cafe" },
        ],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([
      makeTx({ description: "local cafe visit" }),
    ]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(1);
  });

  it("does not match when no OR condition is satisfied", async () => {
    mockOrderBy.mockResolvedValueOnce([
      makeRule({
        conditionCombinator: "OR",
        conditions: [
          { field: "description", operator: "contains", value: "coffee" },
          { field: "description", operator: "contains", value: "cafe" },
        ],
      }),
    ]);
    mockUncatWhere.mockResolvedValueOnce([makeTx({ description: "Countdown supermarket" })]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});

describe("empty or invalid conditions", () => {
  it("does not match when conditions is an empty array", async () => {
    mockOrderBy.mockResolvedValueOnce([makeRule({ conditions: [] as never })]);
    mockUncatWhere.mockResolvedValueOnce([makeTx()]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });

  it("does not match when conditions is not an array", async () => {
    mockOrderBy.mockResolvedValueOnce([makeRule({ conditions: null as never })]);
    mockUncatWhere.mockResolvedValueOnce([makeTx()]);
    const result = await applyRulesToTransactions();
    expect(result).toBe(0);
  });
});
