import type { Contact } from "@/types/contact";
import type { ContactFilter, FilterGroup, FilterCondition } from "@/types/filter";

function evaluateCondition(contact: Contact, cond: FilterCondition): boolean {
  const { field, operator } = cond;
  const strVal = typeof cond.value === "string" ? cond.value.toLowerCase() : "";

  switch (field) {
    case "name":
    case "email":
    case "phone": {
      const raw = field === "name" ? contact.name : field === "email" ? contact.email : contact.phone;
      const v = (raw ?? "").toLowerCase();
      switch (operator) {
        case "contains": return v.includes(strVal);
        case "not_contains": return !v.includes(strVal);
        case "equals": return v === strVal;
        case "not_equals": return v !== strVal;
        case "starts_with": return v.startsWith(strVal);
        case "ends_with": return v.endsWith(strVal);
        case "is_empty": return v.trim() === "";
        case "is_not_empty": return v.trim() !== "";
        default: return false;
      }
    }
    case "tags": {
      const tags = contact.tags.map((t) => t.toLowerCase());
      switch (operator) {
        case "includes_tag": return tags.includes(strVal);
        case "does_not_include_tag": return !tags.includes(strVal);
        case "is_empty": return tags.length === 0;
        case "is_not_empty": return tags.length > 0;
        default: return false;
      }
    }
    case "hasEmail":
      return operator === "is_true" ? contact.hasEmail : !contact.hasEmail;
    case "hasPhone":
      return operator === "is_true" ? contact.hasPhone : !contact.hasPhone;
    default:
      return false;
  }
}

function evaluateGroup(contact: Contact, group: FilterGroup): boolean {
  const results = [
    ...group.conditions.map((c) => evaluateCondition(contact, c)),
    ...(group.groups ?? []).map((g) => evaluateGroup(contact, g)),
  ];
  if (results.length === 0) return true;
  return group.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

export function matchesFilter(contact: Contact, filter: ContactFilter): boolean {
  if (filter.groups.length === 0) return true;
  const results = filter.groups.map((g) => evaluateGroup(contact, g));
  return filter.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

export function describeFilter(filter: ContactFilter): string {
  const parts = filter.groups.map((g) => {
    const condParts = g.conditions.map(
      (c) => `${c.field} ${c.operator}${c.value != null ? ` "${c.value}"` : ""}`,
    );
    return `(${condParts.join(` ${g.logic} `)})`;
  });
  return parts.join(` ${filter.logic} `);
}
