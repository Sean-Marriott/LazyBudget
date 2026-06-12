import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSessionUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "user_1", email: "test@example.com" })
);

vi.mock("@/lib/session", () => ({
  getSessionUser: mockGetSessionUser,
}));

const { dbState, mockDb } = vi.hoisted(() => {
  const dbState = {
    inserted: undefined as Record<string, unknown> | undefined,
    conflictSet: undefined as Record<string, unknown> | undefined,
  };
  const mockDb = {
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => ({
        onConflictDoUpdate: vi.fn((opts: { set: Record<string, unknown> }) => {
          dbState.inserted = values;
          dbState.conflictSet = opts.set;
          return Promise.resolve();
        }),
      })),
    })),
  };
  return { dbState, mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc(${v})`),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    sql: Object.assign(
      vi.fn(() => "sql"),
      { raw: vi.fn() }
    ),
  };
});

import { PUT, DELETE } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/settings/akahu", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/settings/akahu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.inserted = undefined;
    dbState.conflictSet = undefined;
    mockGetSessionUser.mockResolvedValue({ id: "user_1", email: "test@example.com" });
  });

  it("returns 401 when there is no session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await PUT(makeRequest({ appToken: "a", userToken: "u" }));
    expect(res.status).toBe(401);
    expect(dbState.inserted).toBeUndefined();
  });

  it("returns 400 when appToken is missing", async () => {
    const res = await PUT(makeRequest({ userToken: "u" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when userToken is blank", async () => {
    const res = await PUT(makeRequest({ appToken: "a", userToken: "   " }));
    expect(res.status).toBe(400);
  });

  it("encrypts both tokens before storing", async () => {
    const res = await PUT(
      makeRequest({ appToken: " app_tok ", userToken: "user_tok" })
    );
    expect(res.status).toBe(200);
    expect(dbState.inserted).toMatchObject({
      userId: "user_1",
      akahuAppToken: "enc(app_tok)",
      akahuUserToken: "enc(user_tok)",
    });
    expect(dbState.conflictSet).toMatchObject({
      akahuAppToken: "enc(app_tok)",
      akahuUserToken: "enc(user_tok)",
    });
  });
});

describe("DELETE /api/settings/akahu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.inserted = undefined;
    mockGetSessionUser.mockResolvedValue({ id: "user_1", email: "test@example.com" });
  });

  it("returns 401 when there is no session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("clears the stored tokens", async () => {
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(dbState.inserted).toMatchObject({
      userId: "user_1",
      akahuAppToken: null,
      akahuUserToken: null,
    });
  });
});
