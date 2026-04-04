import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock drizzle db and operators using vi.hoisted() to avoid hoisting issues
// ---------------------------------------------------------------------------
const {
  mockSelect,
  mockSelectFrom,
  mockSelectLeftJoin,
  mockSelectWhere,
  mockSelectOrderBy,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => {
  const mockSelectOrderBy = vi.fn().mockResolvedValue([]);
  const mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockSelectOrderBy });
  const mockSelectLeftJoin = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelectFrom = vi.fn().mockReturnValue({ leftJoin: mockSelectLeftJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  return {
    mockSelect,
    mockSelectFrom,
    mockSelectLeftJoin,
    mockSelectWhere,
    mockSelectOrderBy,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

// Mock drizzle-orm operators with simple identity functions so we can inspect
// the arguments passed to them.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((...args) => ({ op: "eq", args })),
    gte: vi.fn((...args) => ({ op: "gte", args })),
    lte: vi.fn((...args) => ({ op: "lte", args })),
    desc: vi.fn((col) => ({ op: "desc", col })),
    and: vi.fn((...conds) => ({ op: "and", conds })),
    or: vi.fn((...conds) => ({ op: "or", conds })),
    ilike: vi.fn((...args) => ({ op: "ilike", args })),
    sql: Object.assign(vi.fn((...args) => ({ op: "sql", args })), { raw: vi.fn() }),
  };
});

// Mock the schema so column references resolve to plain string identifiers.
vi.mock("@/lib/db/schema", () => ({
  transactions: new Proxy(
    {},
    { get: (_t, prop) => `transactions.${String(prop)}` }
  ),
  accounts: new Proxy(
    {},
    { get: (_t, prop) => `accounts.${String(prop)}` }
  ),
}));

import { getTransactions, updateTransaction } from "./transactions";
import { eq, gte, lte, ilike, or, and } from "drizzle-orm";

describe("getTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectOrderBy.mockResolvedValue([]);
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectLeftJoin.mockReturnValue({ where: mockSelectWhere });
    mockSelectFrom.mockReturnValue({ leftJoin: mockSelectLeftJoin });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  const monthStart = new Date("2025-01-01T00:00:00Z");
  const monthEnd = new Date("2025-01-31T23:59:59Z");

  it("calls select().from().leftJoin().where().orderBy() for a basic query", async () => {
    await getTransactions({ monthStart, monthEnd });

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelectFrom).toHaveBeenCalledOnce();
    expect(mockSelectLeftJoin).toHaveBeenCalledOnce();
    expect(mockSelectWhere).toHaveBeenCalledOnce();
    expect(mockSelectOrderBy).toHaveBeenCalledOnce();
  });

  it("includes gte, lte, and isHidden=false conditions in the base query", async () => {
    await getTransactions({ monthStart, monthEnd });

    expect(and).toHaveBeenCalled();
    const andArgs = vi.mocked(and).mock.calls[0];
    // The base query has exactly 3 conditions
    expect(andArgs.length).toBeGreaterThanOrEqual(3);

    expect(gte).toHaveBeenCalledWith(expect.anything(), monthStart);
    expect(lte).toHaveBeenCalledWith(expect.anything(), monthEnd);
    expect(eq).toHaveBeenCalledWith(expect.anything(), false); // isHidden = false
  });

  it("does not call ilike or or() when no search is provided", async () => {
    await getTransactions({ monthStart, monthEnd });

    expect(ilike).not.toHaveBeenCalled();
    expect(or).not.toHaveBeenCalled();
  });

  it("adds ilike OR condition when search is provided", async () => {
    await getTransactions({ monthStart, monthEnd, search: "coffee" });

    expect(ilike).toHaveBeenCalledTimes(2);
    expect(or).toHaveBeenCalledOnce();

    const ilikeCalls = vi.mocked(ilike).mock.calls;
    const patterns = ilikeCalls.map((c) => c[1]);
    expect(patterns).toContain("%coffee%");
  });

  it("does not add category sql condition when category is omitted", async () => {
    await getTransactions({ monthStart, monthEnd });

    const andArgs = vi.mocked(and).mock.calls[0];
    expect(andArgs.length).toBe(3);
  });

  it("adds category SQL condition when category is provided", async () => {
    await getTransactions({ monthStart, monthEnd, category: "Groceries" });

    // 4 conditions: gte + lte + isHidden + category sql
    const andArgs = vi.mocked(and).mock.calls[0];
    expect(andArgs.length).toBe(4);
  });

  it("adds both category and search conditions when both are provided", async () => {
    await getTransactions({ monthStart, monthEnd, category: "Transport", search: "bp" });

    // 5 conditions: gte + lte + isHidden + category + search/or
    const andArgs = vi.mocked(and).mock.calls[0];
    expect(andArgs.length).toBe(5);
    expect(ilike).toHaveBeenCalledTimes(2);
    expect(or).toHaveBeenCalledOnce();
  });

  it("returns the resolved value from the db query", async () => {
    const fakeRows = [{ id: "tx_1", description: "Countdown", amount: "-50.00" }];
    mockSelectOrderBy.mockResolvedValueOnce(fakeRows);

    const result = await getTransactions({ monthStart, monthEnd });
    expect(result).toEqual(fakeRows);
  });

  it("wraps search term with %...% wildcards for ilike", async () => {
    await getTransactions({ monthStart, monthEnd, search: "new world" });

    const ilikeCalls = vi.mocked(ilike).mock.calls;
    for (const call of ilikeCalls) {
      expect(call[1]).toBe("%new world%");
    }
  });

  it("returns an empty array when the db returns no rows", async () => {
    mockSelectOrderBy.mockResolvedValueOnce([]);
    const result = await getTransactions({ monthStart, monthEnd });
    expect(result).toEqual([]);
  });
});

describe("updateTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
  });

  it("calls db.update().set().where() with the correct id and data", async () => {
    const data = { userCategory: "Groceries", isHidden: false };
    await updateTransaction("tx_99", data);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(data);
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith(expect.anything(), "tx_99");
  });

  it("passes partial data through without modification", async () => {
    const data = { isTransfer: true };
    await updateTransaction("tx_1", data);
    expect(mockUpdateSet).toHaveBeenCalledWith(data);
  });

  it("passes null values for userCategory and notes", async () => {
    const data = { userCategory: null, notes: null };
    await updateTransaction("tx_2", data);
    expect(mockUpdateSet).toHaveBeenCalledWith(data);
  });

  it("resolves to void (no return value)", async () => {
    const result = await updateTransaction("tx_3", { isHidden: true });
    expect(result).toBeUndefined();
  });

  it("calls update on the transactions table reference", async () => {
    await updateTransaction("tx_4", { notes: "test" });
    const updateArg = vi.mocked(mockUpdate).mock.calls[0][0];
    expect(updateArg).toBeDefined();
  });
});