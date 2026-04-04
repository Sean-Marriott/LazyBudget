import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionEditDialog } from "./TransactionEditDialog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
type TransactionRow = {
  id: string;
  date: Date;
  description: string;
  amount: string | number;
  type: string | null;
  accountId: string | null;
  accountName: string | null;
  merchantName: string | null;
  akahuCategoryGroup: string | null;
  userCategory: string | null;
  notes: string | null;
  isTransfer: boolean | null;
  isHidden: boolean | null;
};

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "tx_1",
    date: new Date("2025-03-10T00:00:00Z"),
    description: "Countdown Supermarket",
    amount: "-32.50",
    type: "EFTPOS",
    accountId: "acc_1",
    accountName: "Everyday",
    merchantName: null,
    akahuCategoryGroup: "Groceries",
    userCategory: null,
    notes: null,
    isTransfer: false,
    isHidden: false,
    ...overrides,
  };
}

function renderDialog(
  overrides: Partial<TransactionRow> = {},
  open = true,
  onOpenChange = vi.fn()
) {
  const tx = makeTransaction(overrides);
  render(
    <TransactionEditDialog transaction={tx} open={open} onOpenChange={onOpenChange} />
  );
  return { tx, onOpenChange };
}

describe("TransactionEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default fetch mock: successful PATCH
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  // -------------------------------------------------------------------------
  // Render / initial state
  // -------------------------------------------------------------------------
  it("renders the dialog when open=true", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit transaction")).toBeInTheDocument();
  });

  it("does not render the dialog when open=false", () => {
    const tx = makeTransaction();
    render(
      <TransactionEditDialog transaction={tx} open={false} onOpenChange={vi.fn()} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows description when merchantName is null", () => {
    renderDialog({ merchantName: null, description: "Countdown Supermarket" });
    expect(screen.getByText("Countdown Supermarket")).toBeInTheDocument();
  });

  it("shows merchantName when it is set", () => {
    renderDialog({ merchantName: "Countdown", description: "EFTPOS 1234" });
    expect(screen.getByText("Countdown")).toBeInTheDocument();
    expect(screen.queryByText("EFTPOS 1234")).not.toBeInTheDocument();
  });

  it("pre-fills category from transaction.userCategory", () => {
    renderDialog({ userCategory: "Entertainment" });
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select.value).toBe("Entertainment");
  });

  it("defaults category to empty string when userCategory is null", () => {
    renderDialog({ userCategory: null });
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("pre-fills notes from transaction.notes", () => {
    renderDialog({ notes: "Weekly grocery run" });
    const input = screen.getByPlaceholderText("Add a note…") as HTMLInputElement;
    expect(input.value).toBe("Weekly grocery run");
  });

  it("defaults notes to empty string when notes is null", () => {
    renderDialog({ notes: null });
    const input = screen.getByPlaceholderText("Add a note…") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("pre-fills isTransfer checkbox from transaction", () => {
    renderDialog({ isTransfer: true });
    const checkbox = screen.getByLabelText("Mark as transfer") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("pre-fills isHidden checkbox from transaction", () => {
    renderDialog({ isHidden: true });
    const checkbox = screen.getByLabelText("Hide transaction") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("shows the hidden warning when isHidden is checked", () => {
    renderDialog({ isHidden: true });
    expect(screen.getByText("This transaction won't appear in any views.")).toBeInTheDocument();
  });

  it("does not show the hidden warning when isHidden is false", () => {
    renderDialog({ isHidden: false });
    expect(
      screen.queryByText("This transaction won't appear in any views.")
    ).not.toBeInTheDocument();
  });

  it("shows the hidden warning after checking the isHidden checkbox", async () => {
    renderDialog({ isHidden: false });
    const checkbox = screen.getByLabelText("Hide transaction");
    await userEvent.click(checkbox);
    expect(screen.getByText("This transaction won't appear in any views.")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Save changes button state
  // -------------------------------------------------------------------------
  it("renders the Save changes button", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Successful form submission
  // -------------------------------------------------------------------------
  it("calls fetch PATCH with the correct URL and payload on submit", async () => {
    const onOpenChange = vi.fn();
    const tx = makeTransaction({ id: "tx_42", userCategory: "Transport", notes: "Bus fare" });
    render(
      <TransactionEditDialog transaction={tx} open onOpenChange={onOpenChange} />
    );

    const button = screen.getByRole("button", { name: "Save changes" });
    await userEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/transactions/tx_42",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: expect.stringContaining('"isTransfer":false'),
        })
      );
    });
  });

  it("closes the dialog on successful save", async () => {
    const onOpenChange = vi.fn();
    render(
      <TransactionEditDialog
        transaction={makeTransaction()}
        open
        onOpenChange={onOpenChange}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls router.refresh() after successful save", async () => {
    render(
      <TransactionEditDialog
        transaction={makeTransaction()}
        open
        onOpenChange={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });

  it("sends null for empty category on submit", async () => {
    render(
      <TransactionEditDialog
        transaction={makeTransaction({ userCategory: null })}
        open
        onOpenChange={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.userCategory).toBeNull();
    });
  });

  it("sends null for whitespace-only notes on submit", async () => {
    render(
      <TransactionEditDialog
        transaction={makeTransaction({ notes: null })}
        open
        onOpenChange={vi.fn()}
      />
    );

    // Type only spaces into the notes field
    const notesInput = screen.getByPlaceholderText("Add a note…");
    await userEvent.clear(notesInput);
    await userEvent.type(notesInput, "   ");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const body = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.notes).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  it("shows a network error message when fetch throws", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(
      <TransactionEditDialog transaction={makeTransaction()} open onOpenChange={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(
        screen.getByText("Network error. Please check your connection and try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows an error message from the API response when fetch returns non-ok", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "no valid fields provided" }),
    } as Response);

    render(
      <TransactionEditDialog transaction={makeTransaction()} open onOpenChange={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByText("no valid fields provided")).toBeInTheDocument();
    });
  });

  it("shows a generic error when API returns non-ok with no error body", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(
      <TransactionEditDialog transaction={makeTransaction()} open onOpenChange={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("does not close dialog on error", async () => {
    const onOpenChange = vi.fn();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    render(
      <TransactionEditDialog transaction={makeTransaction()} open onOpenChange={onOpenChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  // -------------------------------------------------------------------------
  // State reset when reopened with different transaction
  // -------------------------------------------------------------------------
  it("resets form state when dialog is opened for a new transaction", async () => {
    const tx1 = makeTransaction({ userCategory: "Transport" });
    const tx2 = makeTransaction({ id: "tx_2", userCategory: "Shopping" });

    const { rerender } = render(
      <TransactionEditDialog transaction={tx1} open={false} onOpenChange={vi.fn()} />
    );

    rerender(
      <TransactionEditDialog transaction={tx2} open={true} onOpenChange={vi.fn()} />
    );

    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select.value).toBe("Shopping");
  });

  // -------------------------------------------------------------------------
  // Category dropdown includes expected options
  // -------------------------------------------------------------------------
  it("includes all expense categories and Income and Transfer in the dropdown", () => {
    renderDialog();
    const select = screen.getByLabelText("Category");
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);

    expect(options).toContain("Groceries");
    expect(options).toContain("Eating Out");
    expect(options).toContain("Transport");
    expect(options).toContain("Income");
    expect(options).toContain("Transfer");
    expect(options).toContain(""); // Auto-detect option
  });
});