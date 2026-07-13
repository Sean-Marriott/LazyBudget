import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetBudgetsForMonth = vi.hoisted(() => vi.fn());
const mockCreateBudget = vi.hoisted(() => vi.fn());
const mockGetSessionUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "user_1", email: "test@example.com" })
);

vi.mock("@/lib/session", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/queries/budgets", () => ({
  getBudgetsForMonth: mockGetBudgetsForMonth,
  createBudget: mockCreateBudget,
}));

import { GET, POST } from "./route";

function makeGetRequest(month?: string): Request {
  const qs = month === undefined ? "" : `?month=${encodeURIComponent(month)}`;
  return new Request(`http://localhost/api/budgets${qs}`);
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { month: "2026-06", category: "Groceries", amount: 500 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ id: "user_1", email: "test@example.com" });
  mockGetBudgetsForMonth.mockResolvedValue([]);
  mockCreateBudget.mockResolvedValue({ id: 1 });
});

describe("GET /api/budgets", () => {
  it("returns 401 without a session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await GET(makeGetRequest("2026-06"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when month is missing", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it.each(["2026-13", "2026-00", "garbage", "2026-6"])(
    "returns 400 for invalid month %s",
    async (month) => {
      const res = await GET(makeGetRequest(month));
      expect(res.status).toBe(400);
    }
  );

  it("returns the month's budgets", async () => {
    const rows = [{ id: 1, category: "Groceries" }];
    mockGetBudgetsForMonth.mockResolvedValueOnce(rows);

    const res = await GET(makeGetRequest("2026-06"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(mockGetBudgetsForMonth).toHaveBeenCalledWith("user_1", "2026-06-01");
  });
});

describe("POST /api/budgets", () => {
  it("returns 401 without a session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/budgets", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-object body", async () => {
    const res = await POST(makePostRequest("string"));
    expect(res.status).toBe(400);
  });

  it.each([
    ["missing month", { ...validBody, month: undefined }],
    ["bad month format", { ...validBody, month: "June 2026" }],
    ["missing category", { ...validBody, category: undefined }],
    ["empty category", { ...validBody, category: "   " }],
    ["missing amount", { ...validBody, amount: undefined }],
    ["zero amount", { ...validBody, amount: 0 }],
    ["negative amount", { ...validBody, amount: -50 }],
    ["string amount", { ...validBody, amount: "500" }],
    ["infinite amount", { ...validBody, amount: Infinity }],
    ["non-string notes", { ...validBody, notes: 42 }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await POST(makePostRequest(body));
    expect(res.status).toBe(400);
    expect(mockCreateBudget).not.toHaveBeenCalled();
  });

  it("creates a budget and returns 201", async () => {
    const created = { id: 7, category: "Groceries", amount: "500.00" };
    mockCreateBudget.mockResolvedValueOnce(created);

    const res = await POST(
      makePostRequest({ ...validBody, notes: "  weekly shop  " })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(mockCreateBudget).toHaveBeenCalledWith("user_1", {
      month: "2026-06-01",
      category: "Groceries",
      amount: "500.00",
      notes: "weekly shop",
    });
  });

  it("normalises empty notes to null", async () => {
    await POST(makePostRequest({ ...validBody, notes: "   " }));
    expect(mockCreateBudget).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ notes: null })
    );
  });

  it("returns 409 when the category is already budgeted this month", async () => {
    mockCreateBudget.mockRejectedValueOnce({ code: "23505" });
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 409 when the unique violation is wrapped by Drizzle", async () => {
    // drizzle-orm wraps pg errors in DrizzleQueryError; the code is on `cause`
    mockCreateBudget.mockRejectedValueOnce(
      Object.assign(new Error("Failed query"), { cause: { code: "23505" } })
    );
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(409);
  });
});
