import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TransactionFilters } from "./TransactionFilters";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
const mockPush = vi.fn();
let mockSearchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

// ---------------------------------------------------------------------------
// Fixed "past" month: January 2025 — safely in the past, next button enabled.
// ---------------------------------------------------------------------------
const PAST_MONTH = new Date("2025-01-01T00:00:00Z");
const CURRENT_MONTH_START = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
);

describe("TransactionFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsString = "";
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  it("renders the month label", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    expect(screen.getByText("Jan 2025")).toBeInTheDocument();
  });

  it("renders the category dropdown with 'All categories' option", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("All categories")).toBeInTheDocument();
  });

  it("renders Income and Transfer options in the category dropdown", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const options = Array.from(
      screen.getByRole("combobox").querySelectorAll("option")
    ).map((o) => o.textContent);
    expect(options).toContain("Income");
    expect(options).toContain("Transfer");
  });

  it("renders the search input with correct placeholder", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    expect(screen.getByPlaceholderText("Search transactions\u2026")).toBeInTheDocument();
  });

  it("pre-fills the search input from the search prop", () => {
    render(<TransactionFilters month={PAST_MONTH} search="coffee" />);
    const input = screen.getByPlaceholderText("Search transactions\u2026") as HTMLInputElement;
    expect(input.value).toBe("coffee");
  });

  it("selects the category from the category prop", () => {
    render(<TransactionFilters month={PAST_MONTH} category="Groceries" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("Groceries");
  });

  // -------------------------------------------------------------------------
  // Month navigation buttons
  // -------------------------------------------------------------------------
  it("renders two navigation buttons (prev and next)", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("navigates to the previous month when the left button is clicked", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const [prevButton] = screen.getAllByRole("button");
    fireEvent.click(prevButton);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("month=2024-12"));
  });

  it("navigates to the next month when the right button is clicked", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const [, nextButton] = screen.getAllByRole("button");
    fireEvent.click(nextButton);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("month=2025-02"));
  });

  it("disables the next button when the displayed month is the current month", () => {
    render(<TransactionFilters month={CURRENT_MONTH_START} />);
    const [, nextButton] = screen.getAllByRole("button");
    expect(nextButton).toBeDisabled();
  });

  it("enables the next button for a past month", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const [, nextButton] = screen.getAllByRole("button");
    expect(nextButton).not.toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Month navigation preserves existing search params
  // -------------------------------------------------------------------------
  it("preserves existing search params when navigating months", () => {
    mockSearchParamsString = "search=test&category=Groceries";
    render(<TransactionFilters month={PAST_MONTH} />);
    const [prevButton] = screen.getAllByRole("button");
    fireEvent.click(prevButton);

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("search=test");
    expect(calledUrl).toContain("category=Groceries");
    expect(calledUrl).toContain("month=2024-12");
  });

  // -------------------------------------------------------------------------
  // Category filter
  // -------------------------------------------------------------------------
  it("pushes the selected category to the router when category changes", () => {
    render(<TransactionFilters month={PAST_MONTH} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Transport" } });
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("category=Transport"));
  });

  it("removes the category param when 'All categories' is selected", () => {
    mockSearchParamsString = "category=Transport";
    render(<TransactionFilters month={PAST_MONTH} category="Transport" />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "" } });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("category=");
  });

  // -------------------------------------------------------------------------
  // Search debounce - use fake timers driven via act()
  // -------------------------------------------------------------------------
  it("pushes with the search term after the 400ms debounce delay", () => {
    vi.useFakeTimers();
    render(<TransactionFilters month={PAST_MONTH} />);

    // Flush the initial mount effect debounce
    act(() => { vi.advanceTimersByTime(400); });
    mockPush.mockClear();

    const input = screen.getByPlaceholderText("Search transactions\u2026");
    fireEvent.change(input, { target: { value: "new world" } });

    // Before timer fires, push should not have been called again
    expect(mockPush).not.toHaveBeenCalled();

    // Advance timer to trigger debounce
    act(() => { vi.advanceTimersByTime(400); });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("search=new+world"));

    vi.useRealTimers();
  });

  it("removes the search param when the search field is cleared after debounce", () => {
    mockSearchParamsString = "search=old";
    vi.useFakeTimers();

    render(<TransactionFilters month={PAST_MONTH} search="old" />);

    // Flush mount effect
    act(() => { vi.advanceTimersByTime(400); });
    mockPush.mockClear();

    const input = screen.getByPlaceholderText("Search transactions\u2026");
    fireEvent.change(input, { target: { value: "" } });

    act(() => { vi.advanceTimersByTime(400); });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("search=");

    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // search prop sync (useEffect that watches the `search` prop)
  // -------------------------------------------------------------------------
  it("updates the search input value when the search prop changes", () => {
    const { rerender } = render(
      <TransactionFilters month={PAST_MONTH} search="initial" />
    );
    const input = screen.getByPlaceholderText("Search transactions\u2026") as HTMLInputElement;
    expect(input.value).toBe("initial");

    rerender(<TransactionFilters month={PAST_MONTH} search="updated" />);
    expect(input.value).toBe("updated");
  });

  it("clears the search input when search prop becomes undefined", () => {
    const { rerender } = render(
      <TransactionFilters month={PAST_MONTH} search="hello" />
    );
    const input = screen.getByPlaceholderText("Search transactions\u2026") as HTMLInputElement;
    expect(input.value).toBe("hello");

    rerender(<TransactionFilters month={PAST_MONTH} search={undefined} />);
    expect(input.value).toBe("");
  });
});