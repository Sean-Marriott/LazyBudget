import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetBudgetById = vi.hoisted(() => vi.fn());
const mockUpdateBudget = vi.hoisted(() => vi.fn());
const mockDeleteBudget = vi.hoisted(() => vi.fn());
const mockGetSessionUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "user_1", email: "test@example.com" })
);

vi.mock("@/lib/session", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/queries/budgets", () => ({
  getBudgetById: mockGetBudgetById,
  updateBudget: mockUpdateBudget,
  deleteBudget: mockDeleteBudget,
}));

import { PATCH, DELETE } from "./route";

const existing = {
  id: 1,
  userId: "user_1",
  month: "2026-06-01",
  category: "Groceries",
  budgetType: "SPEND",
  amount: "500.00",
  notes: null,
};

function makePatchRequest(body: unknown): Request {
  return new Request("http://localhost/api/budgets/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ id: "user_1", email: "test@example.com" });
  mockGetBudgetById.mockResolvedValue(existing);
  mockUpdateBudget.mockResolvedValue(existing);
  mockDeleteBudget.mockResolvedValue(undefined);
});

describe("PATCH /api/budgets/[id]", () => {
  it("returns 401 without a session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ amount: 600 }), params("1"));
    expect(res.status).toBe(401);
  });

  it.each(["abc", "0", "-1", "1.5"])("returns 400 for invalid id %s", async (id) => {
    const res = await PATCH(makePatchRequest({ amount: 600 }), params(id));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/budgets/1", { method: "PATCH", body: "nope" }),
      params("1")
    );
    expect(res.status).toBe(400);
  });

  it.each([
    ["empty category", { category: "  " }],
    ["non-string category", { category: 5 }],
    ["zero amount", { amount: 0 }],
    ["negative amount", { amount: -1 }],
    ["string amount", { amount: "600" }],
    ["non-string notes", { notes: [] }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await PATCH(makePatchRequest(body), params("1"));
    expect(res.status).toBe(400);
    expect(mockUpdateBudget).not.toHaveBeenCalled();
  });

  it("returns 404 when the budget does not exist", async () => {
    mockGetBudgetById.mockResolvedValueOnce(null);
    const res = await PATCH(makePatchRequest({ amount: 600 }), params("42"));
    expect(res.status).toBe(404);
  });

  it("applies a partial update and returns the row", async () => {
    const updated = { ...existing, amount: "600.00" };
    mockUpdateBudget.mockResolvedValueOnce(updated);

    const res = await PATCH(
      makePatchRequest({ amount: 600, notes: "  tighter  " }),
      params("1")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(mockUpdateBudget).toHaveBeenCalledWith("user_1", 1, {
      amount: "600.00",
      notes: "tighter",
    });
  });

  it("returns 409 when renaming collides with an existing line", async () => {
    mockUpdateBudget.mockRejectedValueOnce({ code: "23505" });
    const res = await PATCH(makePatchRequest({ category: "Transport" }), params("1"));
    expect(res.status).toBe(409);
  });

  it("returns 409 when the unique violation is wrapped by Drizzle", async () => {
    mockUpdateBudget.mockRejectedValueOnce(
      Object.assign(new Error("Failed query"), { cause: { code: "23505" } })
    );
    const res = await PATCH(makePatchRequest({ category: "Transport" }), params("1"));
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/budgets/[id]", () => {
  it("returns 401 without a session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await DELETE(new Request("http://localhost"), params("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    const res = await DELETE(new Request("http://localhost"), params("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the budget does not exist", async () => {
    mockGetBudgetById.mockResolvedValueOnce(null);
    const res = await DELETE(new Request("http://localhost"), params("42"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns 204", async () => {
    const res = await DELETE(new Request("http://localhost"), params("1"));
    expect(res.status).toBe(204);
    expect(mockDeleteBudget).toHaveBeenCalledWith("user_1", 1);
  });
});
