// Account type → asset/liability classification for net worth
export type AccountGroup = "asset" | "liability" | "excluded";

export function getAccountGroup(type: string): AccountGroup {
  switch (type) {
    case "CHECKING":
    case "SAVINGS":
    case "TERMDEPOSIT":
    case "FOREIGN":
    case "KIWISAVER":
    case "INVESTMENT":
    case "WALLET":
    case "TAX":
      return "asset";
    case "CREDITCARD":
    case "LOAN":
      return "liability";
    case "REWARDS": // Points — exclude from NZD net worth
      return "excluded";
    default:
      return "asset";
  }
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CHECKING: "Everyday",
    SAVINGS: "Savings",
    CREDITCARD: "Credit Card",
    LOAN: "Loan",
    KIWISAVER: "KiwiSaver",
    INVESTMENT: "Investment",
    TERMDEPOSIT: "Term Deposit",
    FOREIGN: "Foreign Currency",
    TAX: "Tax",
    REWARDS: "Rewards",
    WALLET: "Wallet",
  };
  return labels[type] ?? type;
}

export function getAccountTypeColor(type: string): string {
  // Tokyo Night palette — bg uses transparency on the dark surface
  const colors: Record<string, string> = {
    CHECKING:    "bg-[#7aa2f7]/15 text-[#7aa2f7]",
    SAVINGS:     "bg-[#9ece6a]/15 text-[#9ece6a]",
    CREDITCARD:  "bg-[#f7768e]/15 text-[#f7768e]",
    LOAN:        "bg-[#ff9e64]/15 text-[#ff9e64]",
    KIWISAVER:   "bg-[#bb9af7]/15 text-[#bb9af7]",
    INVESTMENT:  "bg-[#7dcfff]/15 text-[#7dcfff]",
    TERMDEPOSIT: "bg-[#73daca]/15 text-[#73daca]",
    FOREIGN:     "bg-[#e0af68]/15 text-[#e0af68]",
    TAX:         "bg-[#a9b1d6]/15 text-[#a9b1d6]",
    REWARDS:     "bg-[#ff9e64]/15 text-[#ff9e64]",
    WALLET:      "bg-[#2ac3de]/15 text-[#2ac3de]",
  };
  return colors[type] ?? "bg-[#565f89]/15 text-[#565f89]";
}
