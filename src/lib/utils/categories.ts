// Our display groups — used for budgets, charts, and badges
export const CATEGORY_COLORS: Record<string, string> = {
  "Eating Out":     "#e0af68", // yellow   — cafes, restaurants, fast food, bars
  "Groceries":      "#9ece6a", // green    — supermarkets, specialty food
  "Transport":      "#7aa2f7", // blue     — fuel, rideshare, parking
  "Shopping":       "#bb9af7", // purple   — clothing, retail, appliances
  "Entertainment":  "#ff9e64", // orange   — streaming, cinema, gaming, events
  "Health":         "#f7768e", // red      — pharmacy, gym, optometrist
  "Home":           "#73daca", // teal     — home goods, hardware
  "Services":       "#a9b1d6", // grey     — professional, financial, memberships
  "Income":         "#9ece6a", // green
  "Transfer":       "#414868", // muted
  "Uncategorised":  "#3b4261", // very muted
};

// Maps the specific NZFCC category name (category.name from Akahu) to
// our own display group. This is more accurate than Akahu's broad
// personal_finance group (which lumps cafes, gambling, and gaming as "Lifestyle").
const NZFCC_TO_GROUP: Record<string, string> = {
  // Eating Out
  "Cafes and restaurants":                       "Eating Out",
  "Fast food stores":                            "Eating Out",
  "Bars, pubs, nightclubs":                      "Eating Out",
  "Liquor stores":                               "Eating Out",

  // Groceries
  "Supermarkets and grocery stores":             "Groceries",
  "Specialty food stores":                       "Groceries",
  "Convenience stores":                          "Groceries",

  // Transport
  "Fuel stations":                               "Transport",
  "Taxi, rideshare, and on-demand transport services": "Transport",
  "Parking services":                            "Transport",
  "Automotive parts and accessories":            "Transport",
  "Transport services (not elsewhere classified)": "Transport",
  "Airlines and air travel":                     "Transport",
  "Public transport":                            "Transport",
  "Vehicle rental and leasing":                  "Transport",
  "Accommodation services":                      "Transport",

  // Shopping
  "Clothing stores":                             "Shopping",
  "General retail stores":                       "Shopping",
  "Sporting goods stores":                       "Shopping",
  "Sports equipment and supplies":               "Shopping",
  "Jewellery and watch stores":                  "Shopping",
  "Books, stationery and art supplies":          "Shopping",
  "Toy and hobby shops":                         "Shopping",
  "Pet stores and veterinary services":          "Shopping",
  "Garden and outdoor supplies":                 "Shopping",

  // Entertainment
  "Cinemas":                                     "Entertainment",
  "Media and entertainment streaming services":  "Entertainment",
  "Digital gaming products and services":        "Entertainment",
  "Events and tickets (not elsewhere classified)": "Entertainment",
  "Casino, lottery, and other gambling services": "Entertainment",
  "Welfare and charity":                         "Entertainment",

  // Health
  "Pharmacies":                                  "Health",
  "Gyms, fitness, aquatic facilities, yoga, pilates": "Health",
  "Optometrists and eyewear":                    "Health",
  "Medical and dental services":                 "Health",
  "Hospitals and specialist health services":    "Health",
  "Health products and supplements":             "Health",

  // Home
  "Computer equipment":                          "Home",
  "Electronic and appliance stores":             "Home",
  "Furniture and homewares stores":              "Home",
  "Hardware and building supplies":              "Home",

  // Services
  "Business software and cloud services":        "Services",
  "Personal software (not elsewhere classified)": "Services",
  "Financial asset brokers, exchanges, and managed funds": "Services",
  "Lending services":                            "Services",
  "Membership organisations (not elsewhere classified)": "Services",
  "Event venue and equipment rental":            "Services",
  "Telecommunications services":                 "Services",
  "Utilities (electricity, gas, water)":         "Services",
  "Insurance services":                          "Services",
  "Government services":                         "Services",
  "Education and training":                      "Services",
  "Legal and professional services":             "Services",
};

/**
 * Map an Akahu NZFCC category name to our display group.
 * Falls back to the broad personal_finance group name if no specific match.
 */
export function mapAkahuCategoryToGroup(
  categoryName: string | null | undefined,
  broadGroup: string | null | undefined
): string {
  if (categoryName && NZFCC_TO_GROUP[categoryName]) {
    return NZFCC_TO_GROUP[categoryName];
  }
  // Translate Akahu's broad groups to our labels where reasonable
  if (broadGroup) {
    const broadMap: Record<string, string> = {
      "Food":                "Groceries",
      "Lifestyle":           "Entertainment",
      "Health":              "Health",
      "Appearance":          "Shopping",
      "Household":           "Home",
      "Transport":           "Transport",
      "Professional Services": "Services",
    };
    return broadMap[broadGroup] ?? broadGroup;
  }
  return "Uncategorised";
}

export function getCategoryColor(
  category: string | null | undefined,
  customColors?: Record<string, string>
): string {
  if (!category) return CATEGORY_COLORS["Uncategorised"];
  return CATEGORY_COLORS[category] ?? customColors?.[category] ?? "#565f89";
}

export function getCategoryLabel(category: string | null | undefined): string {
  return category ?? "Uncategorised";
}

export const EXPENSE_CATEGORIES = [
  "Eating Out",
  "Groceries",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Home",
  "Services",
  "Uncategorised",
];

export const BUDGET_TYPES = ["SPEND", "SAVE", "INVEST", "INCOME"] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];
