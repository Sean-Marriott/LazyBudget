import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist all mock state so it can be referenced inside vi.mock factories
// ---------------------------------------------------------------------------
const { mockDb, dbState } = vi.hoisted(() => {
  const dbState = {
    // Queue of results returned by successive awaited selects (.limit(...))
    selectResults: [] as unknown[][],
    updates: [] as { table: unknown; set: Record<string, unknown>; where: unknown }[],
    deletes: [] as { table: unknown; where: unknown }[],
  };

  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        chain.where = vi.fn(() => chain);
        chain.limit = vi.fn(() => Promise.resolve(dbState.selectResults.shift() ?? []));
        return chain;
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((set: Record<string, unknown>) => ({
        where: vi.fn((where: unknown) => {
          dbState.updates.push({ table, set, where });
          return Promise.resolve();
        }),
      })),
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn((where: unknown) => {
        dbState.deletes.push({ table, where });
        return Promise.resolve();
      }),
    })),
  };

  return { mockDb, dbState };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("../db", () => ({ db: mockDb }));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((...args) => ({ op: "eq", args })),
    and: vi.fn((...args) => ({ op: "and", args })),
    inArray: vi.fn((...args) => ({ op: "inArray", args })),
    notInArray: vi.fn((...args) => ({ op: "notInArray", args })),
    sql: Object.assign(
      vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
        op: "sql",
        strings,
        values,
      })),
      { raw: vi.fn() }
    ),
  };
});

vi.mock("@/lib/db/schema", () => makeSchemaMock());
vi.mock("../db/schema", () => makeSchemaMock());

function makeSchemaMock() {
  const proxyFor = (name: string) =>
    new Proxy({}, { get: (_t, prop) => `${name}.${String(prop)}` });
  return {
    accounts: proxyFor("accounts"),
    transactions: proxyFor("transactions"),
    balanceSnapshots: proxyFor("balanceSnapshots"),
    goals: proxyFor("goals"),
  };
}

import {
  getMigratedId,
  migrateAccount,
  migrateTransactionOverrides,
  markMissingAccountsInactive,
} from "./migration";

beforeEach(() => {
  dbState.selectResults = [];
  dbState.updates = [];
  dbState.deletes = [];
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMigratedId
// ---------------------------------------------------------------------------
describe("getMigratedId", () => {
  it("returns a bare string _migrated id", () => {
    expect(getMigratedId({ _id: "acc_new", _migrated: "acc_old" })).toBe("acc_old");
  });

  it("reads the id from a _migrated object under known keys", () => {
    expect(getMigratedId({ _migrated: { _account: "acc_old" } })).toBe("acc_old");
    expect(getMigratedId({ _migrated: { _id: "trans_old" } })).toBe("trans_old");
    expect(getMigratedId({ _migrated: { _transaction: "trans_old" } })).toBe("trans_old");
  });

  it("returns null when _migrated is absent or unrecognised", () => {
    expect(getMigratedId({ _id: "acc_new" })).toBeNull();
    expect(getMigratedId({ _migrated: "" })).toBeNull();
    expect(getMigratedId({ _migrated: 42 })).toBeNull();
    expect(getMigratedId({ _migrated: { something: 42 } })).toBeNull();
    expect(getMigratedId(null)).toBeNull();
    expect(getMigratedId("acc_old")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// migrateAccount
// ---------------------------------------------------------------------------
describe("migrateAccount", () => {
  it("re-points snapshots, transactions, and goals, then deletes the old account", async () => {
    dbState.selectResults.push([{ id: "acc_old" }]); // old account exists

    const result = await migrateAccount("acc_old", "acc_new");

    expect(result).toBe(true);

    // Colliding old snapshots deleted, then old account row deleted
    expect(dbState.deletes).toHaveLength(2);
    expect((dbState.deletes[0].table as Record<string, string>).id).toBe(
      "balanceSnapshots.id"
    );
    expect((dbState.deletes[1].table as Record<string, string>).id).toBe("accounts.id");
    expect(dbState.deletes[1].where).toMatchObject({
      op: "eq",
      args: ["accounts.id", "acc_old"],
    });

    // Snapshots, transactions, goals all re-pointed to the new id
    expect(dbState.updates).toHaveLength(3);
    for (const update of dbState.updates) {
      expect(update.set).toEqual({ accountId: "acc_new" });
    }
  });

  it("is a no-op when the old account is not in the DB", async () => {
    dbState.selectResults.push([]);

    const result = await migrateAccount("acc_unknown", "acc_new");

    expect(result).toBe(false);
    expect(dbState.updates).toHaveLength(0);
    expect(dbState.deletes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// migrateTransactionOverrides
// ---------------------------------------------------------------------------
describe("migrateTransactionOverrides", () => {
  it("copies user overrides onto the new row and deletes the old one", async () => {
    dbState.selectResults.push([
      { userCategory: "Groceries", notes: "weekly shop", isTransfer: false, isHidden: true },
    ]);

    const result = await migrateTransactionOverrides("trans_old", "trans_new");

    expect(result).toBe(true);

    expect(dbState.updates).toHaveLength(1);
    const { set, where } = dbState.updates[0];
    expect(where).toMatchObject({ op: "eq", args: ["transactions.id", "trans_new"] });
    // Overrides are merged via SQL so values already set on the new row win
    expect(set.userCategory).toMatchObject({
      op: "sql",
      values: ["transactions.userCategory", "Groceries"],
    });
    expect(set.notes).toMatchObject({
      op: "sql",
      values: ["transactions.notes", "weekly shop"],
    });
    expect(set.isTransfer).toMatchObject({
      op: "sql",
      values: ["transactions.isTransfer", false],
    });
    expect(set.isHidden).toMatchObject({
      op: "sql",
      values: ["transactions.isHidden", true],
    });

    expect(dbState.deletes).toHaveLength(1);
    expect(dbState.deletes[0].where).toMatchObject({
      op: "eq",
      args: ["transactions.id", "trans_old"],
    });
  });

  it("is a no-op when the old transaction is not in the DB", async () => {
    dbState.selectResults.push([]);

    const result = await migrateTransactionOverrides("trans_unknown", "trans_new");

    expect(result).toBe(false);
    expect(dbState.updates).toHaveLength(0);
    expect(dbState.deletes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// markMissingAccountsInactive
// ---------------------------------------------------------------------------
describe("markMissingAccountsInactive", () => {
  it("marks ACTIVE accounts not in the Akahu list as INACTIVE", async () => {
    await markMissingAccountsInactive(["acc_1", "acc_2"]);

    expect(dbState.updates).toHaveLength(1);
    const { set, where } = dbState.updates[0];
    expect(set.status).toBe("INACTIVE");
    expect(where).toMatchObject({
      op: "and",
      args: [
        { op: "notInArray", args: ["accounts.id", ["acc_1", "acc_2"]] },
        { op: "eq", args: ["accounts.status", "ACTIVE"] },
      ],
    });
  });

  it("does nothing when the Akahu list is empty (likely a bad response)", async () => {
    await markMissingAccountsInactive([]);

    expect(dbState.updates).toHaveLength(0);
  });
});
