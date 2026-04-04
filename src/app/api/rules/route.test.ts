import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAllRules = vi.hoisted(() => vi.fn());
const mockCreateRule = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queries/rules", () => ({
  getAllRules: mockGetAllRules,
  createRule: mockCreateRule,
}));

import { GET, POST } from "./route";

const VALID_CONDITION = { field: "description", operator: "contains", value: "coffee" };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

function makeGetRequest(): Request {
  return new Request("http://localhost/api/rules", { method: "GET" });
}

const CREATED_RULE = {
  id: 1,
  name: "Coffee",
  enabled: true,
  conditionCombinator: "AND",
  conditions: [VALID_CONDITION],
  setCategory: "Eating Out",
  setNotes: null,
  setTransfer: null,
  setHidden: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  mockGetAllRules.mockReset();
  mockCreateRule.mockReset();
  mockGetAllRules.mockResolvedValue([]);
  mockCreateRule.mockResolvedValue(CREATED_RULE);
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe("GET /api/rules", () => {
  it("returns 200 with the rules array", async () => {
    mockGetAllRules.mockResolvedValueOnce([CREATED_RULE]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([CREATED_RULE]);
  });

  it("returns 200 with an empty array when no rules exist", async () => {
    mockGetAllRules.mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST — body parsing
// ---------------------------------------------------------------------------

describe("POST /api/rules — body parsing", () => {
  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeRawRequest("{not-json{{"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid JSON");
  });

  it("returns 400 when body is null literal", async () => {
    const res = await POST(makeRawRequest("null"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid request body");
  });

  it("returns 400 when body is an array (treated as missing name)", async () => {
    // Arrays are objects in JS, so the route doesn't reject them at the body
    // check; they fall through to the name validation instead.
    const res = await POST(makeRequest([{ name: "test" }]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });
});

// ---------------------------------------------------------------------------
// POST — name validation
// ---------------------------------------------------------------------------

describe("POST /api/rules — name validation", () => {
  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ conditions: [VALID_CONDITION], setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });

  it("returns 400 when name is an empty string", async () => {
    const res = await POST(makeRequest({ name: "", conditions: [VALID_CONDITION], setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });

  it("returns 400 when name is whitespace only", async () => {
    const res = await POST(makeRequest({ name: "   ", conditions: [VALID_CONDITION], setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });

  it("returns 400 when name is a number", async () => {
    const res = await POST(makeRequest({ name: 42, conditions: [VALID_CONDITION], setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("name is required");
  });
});

// ---------------------------------------------------------------------------
// POST — conditionCombinator validation
// ---------------------------------------------------------------------------

describe("POST /api/rules — conditionCombinator validation", () => {
  it("returns 400 for invalid conditionCombinator", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditionCombinator: "XOR", conditions: [VALID_CONDITION], setCategory: "Groceries" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditionCombinator/);
  });

  it("accepts 'AND' as a valid conditionCombinator", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditionCombinator: "AND", conditions: [VALID_CONDITION], setCategory: "Groceries" })
    );
    expect(res.status).toBe(201);
  });

  it("accepts 'OR' as a valid conditionCombinator", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditionCombinator: "OR", conditions: [VALID_CONDITION], setCategory: "Groceries" })
    );
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// POST — conditions validation
// ---------------------------------------------------------------------------

describe("POST /api/rules — conditions validation", () => {
  it("returns 400 when conditions is missing", async () => {
    const res = await POST(makeRequest({ name: "Test", setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when conditions is an empty array", async () => {
    const res = await POST(makeRequest({ name: "Test", conditions: [], setCategory: "Groceries" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition has an invalid field", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [{ field: "amount", operator: "contains", value: "10" }], setCategory: "Groceries" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition has an invalid operator", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [{ field: "description", operator: "regex", value: ".*" }], setCategory: "Groceries" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition value is an empty string", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [{ field: "description", operator: "contains", value: "" }], setCategory: "Groceries" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition value is whitespace only", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [{ field: "description", operator: "contains", value: "   " }], setCategory: "Groceries" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });
});

// ---------------------------------------------------------------------------
// POST — action validation
// ---------------------------------------------------------------------------

describe("POST /api/rules — action validation", () => {
  it("returns 400 when no action field is provided", async () => {
    const res = await POST(makeRequest({ name: "Test", conditions: [VALID_CONDITION] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action/);
  });

  it("returns 400 for an invalid setCategory value", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setCategory: "NotARealCategory" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setCategory/);
  });

  it("returns 400 when setNotes is a number", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setCategory: "Groceries", setNotes: 123 })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setNotes/);
  });

  it("returns 400 when setTransfer is a string", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setTransfer: "yes" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setTransfer/);
  });

  it("returns 400 when setHidden is a number", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setHidden: 1 })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setHidden/);
  });
});

// ---------------------------------------------------------------------------
// POST — successful creation
// ---------------------------------------------------------------------------

describe("POST /api/rules — successful creation", () => {
  it("returns 201 with the created rule", async () => {
    const res = await POST(
      makeRequest({ name: "Coffee Rule", conditions: [VALID_CONDITION], setCategory: "Eating Out" })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(CREATED_RULE);
  });

  it("trims the name before saving", async () => {
    await POST(
      makeRequest({ name: "  Coffee Rule  ", conditions: [VALID_CONDITION], setCategory: "Eating Out" })
    );
    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Coffee Rule" })
    );
  });

  it("trims condition values before saving", async () => {
    await POST(
      makeRequest({
        name: "Test",
        conditions: [{ field: "description", operator: "contains", value: "  coffee  " }],
        setCategory: "Eating Out",
      })
    );
    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: [{ field: "description", operator: "contains", value: "coffee" }],
      })
    );
  });

  it("defaults conditionCombinator to 'AND' when not provided", async () => {
    await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setCategory: "Eating Out" })
    );
    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({ conditionCombinator: "AND" })
    );
  });

  it("coerces empty setNotes string to null", async () => {
    await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setCategory: "Eating Out", setNotes: "  " })
    );
    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({ setNotes: null })
    );
  });

  it("accepts setTransfer: true as sole action", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setTransfer: true })
    );
    expect(res.status).toBe(201);
  });

  it("accepts setHidden: false as sole action", async () => {
    const res = await POST(
      makeRequest({ name: "Test", conditions: [VALID_CONDITION], setHidden: false })
    );
    expect(res.status).toBe(201);
  });

  it("accepts merchantName field in conditions", async () => {
    const res = await POST(
      makeRequest({
        name: "Test",
        conditions: [{ field: "merchantName", operator: "equals", value: "Countdown" }],
        setCategory: "Groceries",
      })
    );
    expect(res.status).toBe(201);
  });
});
