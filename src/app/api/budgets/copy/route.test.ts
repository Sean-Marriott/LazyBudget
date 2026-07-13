import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetLatestBudgetMonthBefore = vi.hoisted(() => vi.fn());
const mockCopyBudgetsFromMonth = vi.hoisted(() => vi.fn());
const mockGetSessionUser = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "user_1", email: "test@example.com" })
);

vi.mock("@/lib/session", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/queries/budgets", () => ({
  getLatestBudgetMonthBefore: mockGetLatestBudgetMonthBefore,
  copyBudgetsFromMonth: mockCopyBudgetsFromMonth,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/budgets/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionUser.mockResolvedValue({ id: "user_1", email: "test@example.com" });
  mockGetLatestBudgetMonthBefore.mockResolvedValue("2026-05-01");
  mockCopyBudgetsFromMonth.mockResolvedValue([{ id: 1 }, { id: 2 }]);
});

describe("POST /api/budgets/copy", () => {
  it("returns 401 without a session", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ month: "2026-06" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/budgets/copy", { method: "POST", body: "x" })
    );
    expect(res.status).toBe(400);
  });

  it.each([undefined, "garbage", "2026-13", 6])(
    "returns 400 for invalid month %s",
    async (month) => {
      const res = await POST(makeRequest({ month }));
      expect(res.status).toBe(400);
    }
  );

  it("returns 404 when no earlier month has budgets", async () => {
    mockGetLatestBudgetMonthBefore.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ month: "2026-06" }));
    expect(res.status).toBe(404);
    expect(mockCopyBudgetsFromMonth).not.toHaveBeenCalled();
  });

  it("copies from the latest earlier month and reports the count", async () => {
    const res = await POST(makeRequest({ month: "2026-06" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ copied: 2, from: "2026-05-01" });
    expect(mockGetLatestBudgetMonthBefore).toHaveBeenCalledWith(
      "user_1",
      "2026-06-01"
    );
    expect(mockCopyBudgetsFromMonth).toHaveBeenCalledWith(
      "user_1",
      "2026-05-01",
      "2026-06-01"
    );
  });

  it("returns copied: 0 when every category already exists", async () => {
    mockCopyBudgetsFromMonth.mockResolvedValueOnce([]);
    const res = await POST(makeRequest({ month: "2026-06" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ copied: 0, from: "2026-05-01" });
  });
});
