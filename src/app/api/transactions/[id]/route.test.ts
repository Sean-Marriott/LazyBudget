import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factory is hoisted to the top of the file, so we must use vi.hoisted()
// to declare mock functions that are referenced inside the factory.
const mockUpdateTransaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queries/transactions", () => ({
  updateTransaction: mockUpdateTransaction,
}));

import { PATCH } from "./route";

// Helper to build a mock Request with a JSON body
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/transactions/tx_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper to build a mock Request with a non-JSON body
function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/transactions/tx_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

// Helper to build params promise
function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/transactions/[id]", () => {
  beforeEach(() => {
    mockUpdateTransaction.mockReset();
    mockUpdateTransaction.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // ID validation
  // -------------------------------------------------------------------------
  it("returns 400 when id is an empty string", async () => {
    const req = makeRequest({ isTransfer: true });
    const res = await PATCH(req, makeParams(""));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid id");
  });

  it("returns 400 when id is whitespace only", async () => {
    const req = makeRequest({ isTransfer: true });
    const res = await PATCH(req, makeParams("   "));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid id");
  });

  // -------------------------------------------------------------------------
  // Body parsing
  // -------------------------------------------------------------------------
  it("returns 400 for invalid JSON body", async () => {
    const req = makeRawRequest("not-json{{{");
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid JSON");
  });

  it("returns 400 when body is an array", async () => {
    const req = makeRequest([{ isTransfer: true }]);
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid request body");
  });

  it("returns 400 when body is null (serialised as null literal)", async () => {
    const req = makeRawRequest("null");
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid request body");
  });

  it("returns 400 when body is a primitive string", async () => {
    const req = makeRawRequest('"hello"');
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid request body");
  });

  // -------------------------------------------------------------------------
  // Field type validation
  // -------------------------------------------------------------------------
  it("returns 400 when userCategory is a number", async () => {
    const req = makeRequest({ userCategory: 42 });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("userCategory must be a string or null");
  });

  it("returns 400 when notes is a boolean", async () => {
    const req = makeRequest({ notes: true });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("notes must be a string or null");
  });

  it("returns 400 when isTransfer is a string", async () => {
    const req = makeRequest({ isTransfer: "yes" });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("isTransfer must be a boolean");
  });

  it("returns 400 when isHidden is a number", async () => {
    const req = makeRequest({ isHidden: 1 });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("isHidden must be a boolean");
  });

  // -------------------------------------------------------------------------
  // Empty update
  // -------------------------------------------------------------------------
  it("returns 400 when no recognised fields are provided", async () => {
    const req = makeRequest({ unknownField: "foo" });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no valid fields provided");
  });

  it("returns 400 when body is an empty object", async () => {
    const req = makeRequest({});
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no valid fields provided");
  });

  // -------------------------------------------------------------------------
  // Successful updates
  // -------------------------------------------------------------------------
  it("returns 200 ok with a minimal valid payload (isTransfer only)", async () => {
    const req = makeRequest({ isTransfer: true });
    const res = await PATCH(req, makeParams("tx_1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_1", { isTransfer: true });
  });

  it("returns 200 ok with a minimal valid payload (isHidden only)", async () => {
    const req = makeRequest({ isHidden: false });
    const res = await PATCH(req, makeParams("tx_2"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_2", { isHidden: false });
  });

  it("passes all valid fields to updateTransaction", async () => {
    const req = makeRequest({
      userCategory: "Groceries",
      notes: "Weekly shop",
      isTransfer: false,
      isHidden: true,
    });
    const res = await PATCH(req, makeParams("tx_3"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_3", {
      userCategory: "Groceries",
      notes: "Weekly shop",
      isTransfer: false,
      isHidden: true,
    });
  });

  it("coerces empty string userCategory to null", async () => {
    const req = makeRequest({ userCategory: "" });
    const res = await PATCH(req, makeParams("tx_4"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_4", { userCategory: null });
  });

  it("passes explicit null userCategory through as null", async () => {
    const req = makeRequest({ userCategory: null });
    const res = await PATCH(req, makeParams("tx_5"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_5", { userCategory: null });
  });

  it("coerces empty string notes to null", async () => {
    const req = makeRequest({ notes: "" });
    const res = await PATCH(req, makeParams("tx_6"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_6", { notes: null });
  });

  it("trims id before calling updateTransaction", async () => {
    const req = makeRequest({ isTransfer: true });
    const res = await PATCH(req, makeParams("  tx_7  "));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_7", { isTransfer: true });
  });

  it("accepts userCategory as a valid string", async () => {
    const req = makeRequest({ userCategory: "Entertainment" });
    const res = await PATCH(req, makeParams("tx_8"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_8", { userCategory: "Entertainment" });
  });

  it("accepts explicit null notes", async () => {
    const req = makeRequest({ notes: null });
    const res = await PATCH(req, makeParams("tx_9"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_9", { notes: null });
  });

  // -------------------------------------------------------------------------
  // Extra field in body should be ignored (only known fields included in update)
  // -------------------------------------------------------------------------
  it("ignores unknown fields and updates only known fields", async () => {
    const req = makeRequest({ isHidden: true, someRandomField: "whatever" });
    const res = await PATCH(req, makeParams("tx_10"));
    expect(res.status).toBe(200);
    expect(mockUpdateTransaction).toHaveBeenCalledWith("tx_10", { isHidden: true });
  });
});