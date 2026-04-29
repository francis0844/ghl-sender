// ---------------------------------------------------------------------------
// Contact filter types
// Stored in app_smart_lists.filter_rules and bulk_send_campaigns.filter_rules.
// ---------------------------------------------------------------------------

/** Fields that can be used in a filter condition. */
export type FilterField =
  | "name"
  | "email"
  | "phone"
  | "tags"
  | "hasEmail"
  | "hasPhone";

/**
 * Operators available per field:
 *
 * Text fields (name, email, phone):
 *   contains, not_contains, equals, not_equals, starts_with, ends_with,
 *   is_empty, is_not_empty
 *
 * Tag field (tags):
 *   includes_tag, does_not_include_tag, is_empty, is_not_empty
 *
 * Boolean fields (hasEmail, hasPhone):
 *   is_true, is_false
 */
export type FilterOperator =
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "includes_tag"
  | "does_not_include_tag"
  | "is_true"
  | "is_false";

/** A single field comparison. */
export interface FilterCondition {
  /** Stable client-generated id (crypto.randomUUID or nanoid). */
  id: string;
  field: FilterField;
  operator: FilterOperator;
  /**
   * The comparison value.
   * - string for text / tag operators
   * - boolean for is_true / is_false (or omit; the operator already implies the value)
   * - omit for is_empty / is_not_empty
   */
  value?: string | boolean;
}

/**
 * A group of conditions combined with a single AND / OR logic.
 * Groups can be nested recursively for compound logic, but the UI
 * will only expose one level of nesting in V1.
 */
export interface FilterGroup {
  /** Stable client-generated id. */
  id: string;
  /** How the conditions (and nested groups) within this group are combined. */
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  /** Optional nested groups for future complex logic. */
  groups?: FilterGroup[];
}

/**
 * Top-level filter definition stored in the database and passed to the API.
 * `logic` controls how the top-level `groups` are combined with each other.
 */
export interface ContactFilter {
  logic: "AND" | "OR";
  groups: FilterGroup[];
}

// ---------------------------------------------------------------------------
// Utility: valid operators per field (used by the FilterSheet UI and server
// validation to restrict operator choices to sensible combinations).
// ---------------------------------------------------------------------------

export const OPERATORS_BY_FIELD: Record<FilterField, FilterOperator[]> = {
  name: [
    "contains", "not_contains", "equals", "not_equals",
    "starts_with", "ends_with", "is_empty", "is_not_empty",
  ],
  email: [
    "contains", "not_contains", "equals", "not_equals",
    "starts_with", "ends_with", "is_empty", "is_not_empty",
  ],
  phone: [
    "contains", "not_contains", "equals", "not_equals",
    "starts_with", "ends_with", "is_empty", "is_not_empty",
  ],
  tags: [
    "includes_tag", "does_not_include_tag", "is_empty", "is_not_empty",
  ],
  hasEmail: ["is_true", "is_false"],
  hasPhone: ["is_true", "is_false"],
};

/** Operators that do not require a value input in the UI. */
export const VALUELESS_OPERATORS: FilterOperator[] = [
  "is_empty",
  "is_not_empty",
  "is_true",
  "is_false",
];

/** Human-readable labels for each field and operator. */
export const FIELD_LABELS: Record<FilterField, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  tags: "Tags",
  hasEmail: "Has Email",
  hasPhone: "Has Phone",
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  not_contains: "does not contain",
  equals: "equals",
  not_equals: "does not equal",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  includes_tag: "includes tag",
  does_not_include_tag: "does not include tag",
  is_true: "is true",
  is_false: "is false",
};
