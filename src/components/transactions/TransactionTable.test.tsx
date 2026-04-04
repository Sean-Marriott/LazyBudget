import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionTable } from "./TransactionTable";

// ---------------------------------------------------------------------------
// Mock next/navigation (required by TransactionEditDialog inside the table)
// ---------------------------------------------------------------------------
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// ---------------------------------------------------------------------------
// Mock global fetch (used by TransactionEditDialog)
// ---------------------------------------------------------------------------
global.fetch = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
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
    date: new Date("2025-01-15T10:00:00Z"),
    description: "New World Supermarket",
    amount: "-45.67",
    type: "EFTPOS",
    accountId: "acc_1",
    accountName: "Everyday Account",
    merchantName: null,
    akahuCategoryGroup: "Groceries",
    userCategory: null,
    notes: null,
    isTransfer: false,
    isHidden: false,
    ...overrides,
  };
}

describe("TransactionTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  it("shows the empty-state message when transactions array is empty", () => {
    render(<TransactionTable transactions={[]} />);
    expect(screen.getByText("No transactions found for this period.")).toBeInTheDocument();
  });

  it("does not render a table when transactions array is empty", () => {
    render(<TransactionTable transactions={[]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Table structure
  // -------------------------------------------------------------------------
  it("renders a table with the correct column headers", () => {
    render(<TransactionTable transactions={[makeTransaction()]} />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("renders one row per transaction", () => {
    const txs = [
      makeTransaction({ id: "tx_1" }),
      makeTransaction({ id: "tx_2", description: "Pak'nSave" }),
    ];
    render(<TransactionTable transactions={txs} />);
    const rows = screen.getAllByRole("row");
    // header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  // -------------------------------------------------------------------------
  // Description / merchant name display
  // -------------------------------------------------------------------------
  it("shows description when merchantName is null", () => {
    render(<TransactionTable transactions={[makeTransaction({ merchantName: null })]} />);
    expect(screen.getByText("New World Supermarket")).toBeInTheDocument();
  });

  it("prefers merchantName over description when merchantName is set", () => {
    render(
      <TransactionTable
        transactions={[makeTransaction({ merchantName: "New World", description: "EFTPOS purchase" })]}
      />
    );
    expect(screen.getByText("New World")).toBeInTheDocument();
    expect(screen.queryByText("EFTPOS purchase")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Account name
  // -------------------------------------------------------------------------
  it("shows account name when available", () => {
    render(<TransactionTable transactions={[makeTransaction({ accountName: "Savings" })]} />);
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("does not render account name element when accountName is null", () => {
    render(<TransactionTable transactions={[makeTransaction({ accountName: null })]} />);
    expect(screen.queryByText("Everyday Account")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Category resolution
  // -------------------------------------------------------------------------
  it("uses userCategory when set", () => {
    render(
      <TransactionTable
        transactions={[makeTransaction({ userCategory: "Entertainment", akahuCategoryGroup: "Lifestyle" })]}
      />
    );
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("falls back to akahuCategoryGroup when userCategory is null", () => {
    render(
      <TransactionTable
        transactions={[makeTransaction({ userCategory: null, akahuCategoryGroup: "Groceries" })]}
      />
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("falls back to Uncategorised when both userCategory and akahuCategoryGroup are null", () => {
    render(
      <TransactionTable
        transactions={[makeTransaction({ userCategory: null, akahuCategoryGroup: null })]}
      />
    );
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("shows Transfer category for transfer transactions", () => {
    render(<TransactionTable transactions={[makeTransaction({ isTransfer: true })]} />);
    expect(screen.getByText("Transfer")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Amount formatting
  // -------------------------------------------------------------------------
  it("shows + prefix for positive (income) amounts", () => {
    render(<TransactionTable transactions={[makeTransaction({ amount: "100.00" })]} />);
    // The cell renders "+" then the formatted amount, both as text siblings
    const cell = screen.getByText(/\+/);
    expect(cell).toBeInTheDocument();
  });

  it("does not show + prefix for negative (expense) amounts", () => {
    render(<TransactionTable transactions={[makeTransaction({ amount: "-50.00" })]} />);
    // There should be no "+" text node in the amount cell
    const amountCells = screen.queryAllByText(/^\+/);
    expect(amountCells).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Click to open edit dialog
  // -------------------------------------------------------------------------
  it("opens the edit dialog when a row is clicked", () => {
    render(<TransactionTable transactions={[makeTransaction({ description: "Coffee Shop" })]} />);

    // The dialog should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click the row
    const row = screen.getByText("Coffee Shop").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    // Edit dialog should now be present
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit transaction")).toBeInTheDocument();
  });

  it("does not render the edit dialog before any row is clicked", () => {
    render(<TransactionTable transactions={[makeTransaction()]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Transfer row styling
  // -------------------------------------------------------------------------
  it("applies muted class to transfer transaction rows", () => {
    render(<TransactionTable transactions={[makeTransaction({ isTransfer: true })]} />);
    const rows = screen.getAllByRole("row");
    // Second row (index 1) is the data row
    const dataRow = rows[1];
    expect(dataRow.className).toContain("text-muted-foreground");
  });

  it("does not apply muted class to regular (non-transfer) rows", () => {
    render(<TransactionTable transactions={[makeTransaction({ isTransfer: false })]} />);
    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    // cursor-pointer is always there; text-muted-foreground should NOT be present via isTransfer
    // The row class includes muted-foreground in Date cell, not necessarily the row itself — just
    // confirm the row className does NOT add the muted class from the isTransfer branch
    expect(dataRow.className).not.toMatch(/text-muted-foreground/);
  });
});