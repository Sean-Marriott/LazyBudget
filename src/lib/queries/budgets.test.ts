import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist all mock functions so they can be referenced inside vi.mock factories
// ---------------------------------------------------------------------------
const {
  mockSelect,
  mockFrom,
  mockSelectWhere,
  mockOrderBy,
  mockInsert,
  mockValues,
  mockOnConflictDoNothing,
  mockInsertReturning,
  mockUpdate,
  mockSet,
  mockUpdateWhere,
  mockUpdateReturning,
  mockDelete,
  mockDeleteWhere,
} = vi.hoisted(() => {
  const mockOrderBy = vi.fn().mockResolvedValue([]);
  // select().from().where() is awaited directly by getBudgetById /
  // getLatestBudgetMonthBefore, and chained with .orderBy() by
  // getBudgetsForMonth — return a thenable that also has orderBy.
  const mockSelectWhere = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  const mockInsertReturning = vi.fn().mockResolvedValue([]);
  const mockOnConflictDoNothing = vi
    .fn()
    .mockReturnValue({ returning: mockInsertReturning });
  const mockValues = vi.fn().mockReturnValue({
    returning: mockInsertReturning,
    onConflictDoNothing: mockOnConflictDoNothing,
  });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockUpdateReturning = vi.fn().mockResolvedValue([]);
  const mockUpdateWhere = vi
    .fn()
    .mockReturnValue({ returning: mockUpdateReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

  return {
    mockSelect,
    mockFrom,
    mockSelectWhere,
    mockOrderBy,
    mockInsert,
    mockValues,
    mockOnConflictDoNothing,
    mockInsertReturning,
    mockUpdate,
    mockSet,
    mockUpdateWhere,
    mockUpdateReturning,
    mockDelete,
    mockDeleteWhere,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  budgets: new Proxy({}, { get: (_t, prop) => `budgets.${String(prop)}` }),
}));

// Spy on inArray while delegating to the real implementation, so
// cascadeCategoryRename's id-targeting can be asserted on directly without
// affecting how any where-clause actually behaves.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    inArray: vi.fn((...args: Parameters<typeof actual.inArray>) =>
      actual.inArray(...args)
    ),
  };
});

import { inArray } from "drizzle-orm";
import {
  getBudgetsForMonth,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getLatestBudgetMonthBefore,
  copyBudgetsFromMonth,
  cascadeCategoryRename,
  deleteBudgetsForCategory,
} from "./budgets";
import type { Budget } from "./budgets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 1,
    userId: "user_1",
    month: "2026-06-01",
    category: "Groceries",
    budgetType: "SPEND",
    amount: "500.00",
    notes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/** Configure select().from().where() to resolve rows (and support .orderBy). */
function setSelectResult(rows: unknown[]) {
  mockOrderBy.mockResolvedValue(rows);
  mockSelectWhere.mockReturnValue({
    orderBy: mockOrderBy,
    then: (resolve: (v: unknown[]) => void) => resolve(rows),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSelectResult([]);
  mockFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
  mockInsertReturning.mockResolvedValue([]);
  mockOnConflictDoNothing.mockReturnValue({ returning: mockInsertReturning });
  mockValues.mockReturnValue({
    returning: mockInsertReturning,
    onConflictDoNothing: mockOnConflictDoNothing,
  });
  mockInsert.mockReturnValue({ values: mockValues });
  mockUpdateReturning.mockResolvedValue([]);
  mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockSet });
  mockDeleteWhere.mockResolvedValue(undefined);
  mockDelete.mockReturnValue({ where: mockDeleteWhere });
});

// ---------------------------------------------------------------------------
// getBudgetsForMonth
// ---------------------------------------------------------------------------

describe("getBudgetsForMonth", () => {
  it("returns the rows for the month ordered by category", async () => {
    const rows = [makeBudget(), makeBudget({ id: 2, category: "Transport" })];
    setSelectResult(rows);

    const result = await getBudgetsForMonth("user_1", "2026-06-01");

    expect(result).toEqual(rows);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockOrderBy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getBudgetById
// ---------------------------------------------------------------------------

describe("getBudgetById", () => {
  it("returns the row when found", async () => {
    const budget = makeBudget();
    setSelectResult([budget]);

    expect(await getBudgetById("user_1", 1)).toEqual(budget);
  });

  it("returns null when no row matches", async () => {
    setSelectResult([]);

    expect(await getBudgetById("user_1", 999)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createBudget
// ---------------------------------------------------------------------------

describe("createBudget", () => {
  it("injects budgetType SPEND and userId", async () => {
    const created = makeBudget();
    mockInsertReturning.mockResolvedValue([created]);

    const result = await createBudget("user_1", {
      month: "2026-06-01",
      category: "Groceries",
      amount: "500.00",
      notes: null,
    });

    expect(mockValues).toHaveBeenCalledWith({
      month: "2026-06-01",
      category: "Groceries",
      amount: "500.00",
      notes: null,
      budgetType: "SPEND",
      userId: "user_1",
    });
    expect(result).toEqual(created);
  });
});

// ---------------------------------------------------------------------------
// updateBudget
// ---------------------------------------------------------------------------

describe("updateBudget", () => {
  it("returns the updated row", async () => {
    const updated = makeBudget({ amount: "600.00" });
    mockUpdateReturning.mockResolvedValue([updated]);

    const result = await updateBudget("user_1", 1, { amount: "600.00" });

    expect(mockSet).toHaveBeenCalledWith({ amount: "600.00" });
    expect(result).toEqual(updated);
  });

  it("returns null when no row matches (missing or not owned)", async () => {
    mockUpdateReturning.mockResolvedValue([]);

    expect(await updateBudget("user_1", 999, { amount: "600.00" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteBudget
// ---------------------------------------------------------------------------

describe("deleteBudget", () => {
  it("issues a delete scoped by the where clause", async () => {
    await deleteBudget("user_1", 1);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getLatestBudgetMonthBefore
// ---------------------------------------------------------------------------

describe("getLatestBudgetMonthBefore", () => {
  it("returns the max month string", async () => {
    setSelectResult([{ month: "2026-05-01" }]);

    expect(await getLatestBudgetMonthBefore("user_1", "2026-06-01")).toBe(
      "2026-05-01"
    );
  });

  it("returns null when there are no earlier budgets", async () => {
    // max() over zero rows yields a single row with a null value
    setSelectResult([{ month: null }]);

    expect(
      await getLatestBudgetMonthBefore("user_1", "2026-06-01")
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// copyBudgetsFromMonth
// ---------------------------------------------------------------------------

describe("copyBudgetsFromMonth", () => {
  it("returns [] without inserting when the source month is empty", async () => {
    setSelectResult([]);

    const result = await copyBudgetsFromMonth(
      "user_1",
      "2026-05-01",
      "2026-06-01"
    );

    expect(result).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("copies source rows onto the target month, skipping conflicts", async () => {
    const source = [
      makeBudget({ id: 1, category: "Groceries", amount: "500.00" }),
      makeBudget({ id: 2, category: "Transport", amount: "150.00", notes: "bus" }),
    ];
    setSelectResult(source);
    const inserted = [makeBudget({ id: 3, month: "2026-06-01" })];
    mockInsertReturning.mockResolvedValue(inserted);

    const result = await copyBudgetsFromMonth(
      "user_1",
      "2026-05-01",
      "2026-06-01"
    );

    expect(mockValues).toHaveBeenCalledWith([
      {
        userId: "user_1",
        month: "2026-06-01",
        category: "Groceries",
        budgetType: "SPEND",
        amount: "500.00",
        notes: null,
      },
      {
        userId: "user_1",
        month: "2026-06-01",
        category: "Transport",
        budgetType: "SPEND",
        amount: "150.00",
        notes: "bus",
      },
    ]);
    expect(mockOnConflictDoNothing).toHaveBeenCalledWith({
      target: ["budgets.userId", "budgets.month", "budgets.category"],
    });
    expect(result).toEqual(inserted);
  });
});

// ---------------------------------------------------------------------------
// cascadeCategoryRename / deleteBudgetsForCategory
//
// These take an explicit dbClient (so they can run inside a caller's
// `tx`), so tests build a small self-contained fake client rather than
// reusing the module-level `db` mocks above.
// ---------------------------------------------------------------------------

/** Builds a fake dbClient; `selectResults` is consumed in call order. */
function makeFakeClient(selectResults: unknown[][]) {
  let selectCallIndex = 0;
  const setCalls: unknown[] = [];
  const deleteWhereCalls: unknown[] = [];
  const updateWhereCalls: unknown[] = [];

  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() =>
        Promise.resolve(selectResults[selectCallIndex++] ?? [])
      ),
    })),
  }));
  const del = vi.fn(() => ({
    where: vi.fn((whereArg: unknown) => {
      deleteWhereCalls.push(whereArg);
      return Promise.resolve(undefined);
    }),
  }));
  const update = vi.fn(() => ({
    set: vi.fn((setArg: unknown) => {
      setCalls.push(setArg);
      return {
        where: vi.fn((whereArg: unknown) => {
          updateWhereCalls.push(whereArg);
          return Promise.resolve(undefined);
        }),
      };
    }),
  }));

  return {
    client: { select, delete: del, update } as never,
    select,
    delete: del,
    update,
    setCalls,
    deleteWhereCalls,
    updateWhereCalls,
  };
}

describe("cascadeCategoryRename", () => {
  it("does nothing when the old category has no budget lines", async () => {
    const { client, delete: del, update } = makeFakeClient([[]]);

    await cascadeCategoryRename(client, "user_1", "Groceries", "Food");

    expect(del).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("renames every stale line when none conflict with the new name", async () => {
    const stale = [
      { id: 1, month: "2026-05-01" },
      { id: 2, month: "2026-06-01" },
    ];
    const { client, delete: del, setCalls, updateWhereCalls } = makeFakeClient([
      stale, // select stale (old name)
      [], // select conflicts (new name) — none
    ]);

    await cascadeCategoryRename(client, "user_1", "Groceries", "Food");

    expect(del).not.toHaveBeenCalled();
    expect(setCalls).toEqual([{ category: "Food" }]);
    expect(updateWhereCalls).toHaveLength(1);
    expect(inArray).toHaveBeenCalledWith("budgets.id", [1, 2]);
  });

  it("drops stale lines whose month already has a new-name budget, renames the rest", async () => {
    const stale = [
      { id: 1, month: "2026-05-01" }, // will conflict
      { id: 2, month: "2026-06-01" }, // will rename
    ];
    const conflicts = [{ month: "2026-05-01" }];
    const { client, setCalls, deleteWhereCalls, updateWhereCalls } =
      makeFakeClient([stale, conflicts]);

    await cascadeCategoryRename(client, "user_1", "Groceries", "Food");

    expect(deleteWhereCalls).toHaveLength(1);
    expect(inArray).toHaveBeenCalledWith("budgets.id", [1]);
    expect(setCalls).toEqual([{ category: "Food" }]);
    expect(updateWhereCalls).toHaveLength(1);
    expect(inArray).toHaveBeenCalledWith("budgets.id", [2]);
  });

  it("deletes all stale lines and renames none when every month conflicts", async () => {
    const stale = [{ id: 1, month: "2026-05-01" }];
    const conflicts = [{ month: "2026-05-01" }];
    const { client, update, deleteWhereCalls } = makeFakeClient([
      stale,
      conflicts,
    ]);

    await cascadeCategoryRename(client, "user_1", "Groceries", "Food");

    expect(deleteWhereCalls).toHaveLength(1);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteBudgetsForCategory", () => {
  it("deletes every budget line under the given category for that user", async () => {
    const { client, delete: del, deleteWhereCalls } = makeFakeClient([]);

    await deleteBudgetsForCategory(client, "user_1", "Groceries");

    expect(del).toHaveBeenCalledTimes(1);
    expect(deleteWhereCalls).toHaveLength(1);
  });
});
