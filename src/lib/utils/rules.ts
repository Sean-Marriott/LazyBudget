export interface RulePrefill {
  name: string;
  conditionField: "description" | "merchantName";
  conditionValue: string;
  setCategory?: string;
  setNotes?: string;
  setTransfer?: boolean;
  setHidden?: boolean;
}

export const RULE_CONDITION_FIELDS = ["description", "merchantName"] as const;
export type RuleConditionField = (typeof RULE_CONDITION_FIELDS)[number];

export const RULE_CONDITION_OPERATORS = ["contains", "equals", "starts_with"] as const;
export type RuleConditionOperator = (typeof RULE_CONDITION_OPERATORS)[number];

export const RULE_CONDITION_FIELD_LABELS: Record<RuleConditionField, string> = {
  description: "Description",
  merchantName: "Merchant name",
};

export const RULE_CONDITION_OPERATOR_LABELS: Record<RuleConditionOperator, string> = {
  contains: "contains",
  equals: "equals",
  starts_with: "starts with",
};
