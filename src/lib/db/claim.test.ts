import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db: select().from() resolves the user count; transaction() exposes a tx
// that records updates and the user_settings insert.
// ---------------------------------------------------------------------------
const { mockDb, dbState } = vi.hoisted(() => {
  const dbState = {
    userCount: 1,
    appSettingsRow: undefined as { key: string; value: string } | undefined,
    updates: [] as { table: unknown; set: Record<string, unknown> }[],
    inserted: undefined as Record<string, unknown> | undefined,
  };

  const tx = {
    update: vi.fn((table: unknown) => ({
      set: vi.fn((set: Record<string, unknown>) => ({
        where: vi.fn(() => {
          dbState.updates.push({ table, set });
          return Promise.resolve();
        }),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() =>
          Promise.resolve(dbState.appSettingsRow ? [dbState.appSettingsRow] : [])
        ),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => ({
        onConflictDoNothing: vi.fn(() => {
          dbState.inserted = values;
          return Promise.resolve();
        }),
      })),
    })),
  };

  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => Promise.resolve([{ value: dbState.userCount }])),
    })),
    transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  };

  return { mockDb, dbState };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc(${v})`),
}));

import { claimOrphanedData } from "./claim";

describe("claimOrphanedData", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbState.userCount = 1;
    dbState.appSettingsRow = undefined;
    dbState.updates = [];
    dbState.inserted = undefined;
    savedEnv = {
      AKAHU_APP_TOKEN: process.env.AKAHU_APP_TOKEN,
      AKAHU_USER_TOKEN: process.env.AKAHU_USER_TOKEN,
    };
    delete process.env.AKAHU_APP_TOKEN;
    delete process.env.AKAHU_USER_TOKEN;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("does nothing when more than one user exists", async () => {
    dbState.userCount = 2;
    await claimOrphanedData("user_2");
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("claims all 10 owned tables for the first user", async () => {
    await claimOrphanedData("user_1");
    expect(dbState.updates).toHaveLength(10);
    for (const u of dbState.updates) {
      expect(u.set).toEqual({ userId: "user_1" });
    }
  });

  it("migrates last_sync_at from app_settings into user_settings", async () => {
    dbState.appSettingsRow = {
      key: "last_sync_at",
      value: "2026-06-01T00:00:00.000Z",
    };
    await claimOrphanedData("user_1");
    expect(dbState.inserted?.lastSyncAt).toEqual(
      new Date("2026-06-01T00:00:00.000Z")
    );
  });

  it("encrypts env-var Akahu tokens into user_settings when present", async () => {
    process.env.AKAHU_APP_TOKEN = "app_tok";
    process.env.AKAHU_USER_TOKEN = "user_tok";
    await claimOrphanedData("user_1");
    expect(dbState.inserted?.akahuAppToken).toBe("enc(app_tok)");
    expect(dbState.inserted?.akahuUserToken).toBe("enc(user_tok)");
  });

  it("stores null tokens when env vars are absent", async () => {
    await claimOrphanedData("user_1");
    expect(dbState.inserted?.akahuAppToken).toBeNull();
    expect(dbState.inserted?.akahuUserToken).toBeNull();
  });
});
