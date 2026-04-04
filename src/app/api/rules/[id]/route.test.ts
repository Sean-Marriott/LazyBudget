import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRuleById = vi.hoisted(() => vi.fn());
const mockUpdateRule = vi.hoisted(() => vi.fn());
const mockDeleteRule = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queries/rules", () => ({
  getRuleById: mockGetRuleById,
  updateRule: mockUpdateRule,
  deleteRule: mockDeleteRule,
}));

import { PATCH, DELETE } from "./route";

const VALID_CONDITION = { field: "description", operator: "contains", value: "coffee" };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rules/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/rules/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

function makeDeleteRequest(): Request {
  return new Request("http://localhost/api/rules/1", { method: "DELETE" });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const UPDATED_RULE = {
  id: 1,
  name: "Updated Rule",
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
  mockGetRuleById.mockReset();
  mockUpdateRule.mockReset();
  mockDeleteRule.mockReset();
  // By default, the rule exists and has an action (setCategory)
  mockGetRuleById.mockResolvedValue(UPDATED_RULE);
  mockUpdateRule.mockResolvedValue(UPDATED_RULE);
  mockDeleteRule.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// PATCH — id validation
// ---------------------------------------------------------------------------

describe("PATCH /api/rules/[id] — id validation", () => {
  it("returns 400 for a non-numeric id", async () => {
    const res = await PATCH(makeRequest({ name: "Test" }), makeParams("abc"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });

  it("returns 400 for id of zero", async () => {
    const res = await PATCH(makeRequest({ name: "Test" }), makeParams("0"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });

  it("returns 400 for a negative id", async () => {
    const res = await PATCH(makeRequest({ name: "Test" }), makeParams("-5"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });

  it("returns 400 for a float id", async () => {
    const res = await PATCH(makeRequest({ name: "Test" }), makeParams("1.5"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });
});

// ---------------------------------------------------------------------------
// PATCH — body parsing
// ---------------------------------------------------------------------------

describe("PATCH /api/rules/[id] — body parsing", () => {
  it("returns 400 for invalid JSON", async () => {
    const res = await PATCH(makeRawRequest("{bad-json"), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid JSON");
  });

  it("returns 400 when body is null literal", async () => {
    const res = await PATCH(makeRawRequest("null"), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid request body");
  });

  it("accepts an array body without error (no recognised fields → empty patch, existing actions preserved)", async () => {
    // Arrays are objects in JS, so the route doesn't reject them at the body
    // check; all fields resolve to undefined resulting in an empty data object.
    // The existing rule (returned by getRuleById) still has actions so hasAction
    // is true and updateRule is called with an empty patch.
    const res = await PATCH(makeRequest([{ name: "x" }]), makeParams("1"));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PATCH — field validation
// ---------------------------------------------------------------------------

describe("PATCH /api/rules/[id] — field validation", () => {
  it("returns 400 when name is an empty string", async () => {
    const res = await PATCH(makeRequest({ name: "" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/);
  });

  it("returns 400 when name is whitespace only", async () => {
    const res = await PATCH(makeRequest({ name: "   " }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/);
  });

  it("returns 400 when enabled is a string", async () => {
    const res = await PATCH(makeRequest({ enabled: "true" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/enabled/);
  });

  it("returns 400 when enabled is a number", async () => {
    const res = await PATCH(makeRequest({ enabled: 1 }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/enabled/);
  });

  it("returns 400 for invalid conditionCombinator", async () => {
    const res = await PATCH(makeRequest({ conditionCombinator: "BOTH" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditionCombinator/);
  });

  it("returns 400 when conditions is an empty array", async () => {
    const res = await PATCH(makeRequest({ conditions: [] }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition has an invalid field", async () => {
    const res = await PATCH(
      makeRequest({ conditions: [{ field: "amount", operator: "contains", value: "5" }] }),
      makeParams("1")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 when a condition has an invalid operator", async () => {
    const res = await PATCH(
      makeRequest({ conditions: [{ field: "description", operator: "like", value: "coffee" }] }),
      makeParams("1")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/conditions/);
  });

  it("returns 400 for an invalid setCategory", async () => {
    const res = await PATCH(makeRequest({ setCategory: "FakeCategory" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setCategory/);
  });

  it("returns 400 when setNotes is not a string", async () => {
    const res = await PATCH(makeRequest({ setNotes: true }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setNotes/);
  });

  it("returns 400 when setTransfer is a string", async () => {
    const res = await PATCH(makeRequest({ setTransfer: "yes" }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setTransfer/);
  });

  it("returns 400 when setHidden is a number", async () => {
    const res = await PATCH(makeRequest({ setHidden: 0 }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/setHidden/);
  });
});

// ---------------------------------------------------------------------------
// PATCH — not found
// ---------------------------------------------------------------------------

describe("PATCH /api/rules/[id] — not found", () => {
  it("returns 404 when the rule does not exist", async () => {
    mockGetRuleById.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ name: "New Name" }), makeParams("99"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not found");
  });
});

// ---------------------------------------------------------------------------
// PATCH — successful update
// ---------------------------------------------------------------------------

describe("PATCH /api/rules/[id] — successful update", () => {
  it("returns 200 with the updated rule", async () => {
    const res = await PATCH(makeRequest({ name: "New Name" }), makeParams("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(UPDATED_RULE);
  });

  it("passes trimmed name to updateRule", async () => {
    await PATCH(makeRequest({ name: "  Trimmed Name  " }), makeParams("1"));
    expect(mockUpdateRule).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: "Trimmed Name" })
    );
  });

  it("passes enabled: false correctly", async () => {
    await PATCH(makeRequest({ enabled: false }), makeParams("1"));
    expect(mockUpdateRule).toHaveBeenCalledWith(1, expect.objectContaining({ enabled: false }));
  });

  it("passes enabled: true correctly", async () => {
    await PATCH(makeRequest({ enabled: true }), makeParams("2"));
    expect(mockUpdateRule).toHaveBeenCalledWith(2, expect.objectContaining({ enabled: true }));
  });

  it("trims condition values before saving", async () => {
    await PATCH(
      makeRequest({
        conditions: [{ field: "description", operator: "contains", value: "  coffee  " }],
      }),
      makeParams("1")
    );
    expect(mockUpdateRule).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        conditions: [{ field: "description", operator: "contains", value: "coffee" }],
      })
    );
  });

  it("coerces empty setNotes string to null", async () => {
    await PATCH(makeRequest({ setNotes: "   " }), makeParams("1"));
    expect(mockUpdateRule).toHaveBeenCalledWith(1, expect.objectContaining({ setNotes: null }));
  });

  it("passes null setCategory through when another action remains", async () => {
    // Existing rule has setNotes set, so clearing setCategory still leaves an action
    mockGetRuleById.mockResolvedValueOnce({ ...UPDATED_RULE, setNotes: "auto-tagged" });
    await PATCH(makeRequest({ setCategory: null }), makeParams("1"));
    expect(mockUpdateRule).toHaveBeenCalledWith(1, expect.objectContaining({ setCategory: null }));
  });

  it("returns 400 when patch would clear the last remaining action", async () => {
    // Existing rule has only setCategory; clearing it leaves no action
    mockGetRuleById.mockResolvedValueOnce({
      ...UPDATED_RULE,
      setCategory: "Eating Out",
      setNotes: null,
      setTransfer: null,
      setHidden: null,
    });
    const res = await PATCH(makeRequest({ setCategory: null }), makeParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action/);
  });

  it("passes conditionCombinator 'OR' correctly", async () => {
    await PATCH(makeRequest({ conditionCombinator: "OR" }), makeParams("1"));
    expect(mockUpdateRule).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ conditionCombinator: "OR" })
    );
  });

  it("only includes fields present in the request body", async () => {
    await PATCH(makeRequest({ enabled: false }), makeParams("1"));
    const calledWith = mockUpdateRule.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(calledWith)).toEqual(["enabled"]);
  });
});

// ---------------------------------------------------------------------------
// DELETE — id validation
// ---------------------------------------------------------------------------

describe("DELETE /api/rules/[id] — id validation", () => {
  it("returns 400 for a non-numeric id", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams("abc"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });

  it("returns 400 for id of zero", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams("0"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });

  it("returns 400 for a negative id", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams("-1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid id");
  });
});

// ---------------------------------------------------------------------------
// DELETE — successful deletion
// ---------------------------------------------------------------------------

describe("DELETE /api/rules/[id] — successful deletion", () => {
  it("returns 204 with no body for a valid id", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams("1"));
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe("");
  });

  it("calls deleteRule with the parsed numeric id", async () => {
    await DELETE(makeDeleteRequest(), makeParams("42"));
    expect(mockDeleteRule).toHaveBeenCalledWith(42);
  });
});
