"use client";

import { X } from "lucide-react";
import type { FilterCondition, FilterField, FilterOperator } from "@/types/filter";
import {
  FIELD_LABELS,
  OPERATOR_LABELS,
  OPERATORS_BY_FIELD,
  VALUELESS_OPERATORS,
} from "@/types/filter";

interface Props {
  condition: FilterCondition;
  onChange: (cond: FilterCondition) => void;
  onRemove: () => void;
}

const FIELDS: FilterField[] = ["name", "email", "phone", "tags", "hasEmail", "hasPhone"];

const selectClass =
  "w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring";

export default function FilterRuleRow({ condition, onChange, onRemove }: Props) {
  const operators = OPERATORS_BY_FIELD[condition.field];
  const needsValue = !VALUELESS_OPERATORS.includes(condition.operator);

  const handleFieldChange = (field: FilterField) => {
    const newOps = OPERATORS_BY_FIELD[field];
    const op = newOps.includes(condition.operator) ? condition.operator : newOps[0];
    onChange({ ...condition, field, operator: op, value: "" });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    const val = VALUELESS_OPERATORS.includes(operator) ? undefined : condition.value;
    onChange({ ...condition, operator, value: val });
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/40 border border-border/50">
      <div className="flex items-center gap-2">
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value as FilterField)}
          className={`${selectClass} flex-1`}
        >
          {FIELDS.map((f) => (
            <option key={f} value={f}>
              {FIELD_LABELS[f]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove rule"
          className="h-11 w-11 flex items-center justify-center rounded-xl text-muted-foreground active:bg-muted transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <select
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
        className={selectClass}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {needsValue && (
        <input
          type="text"
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder={condition.field === "tags" ? "Tag name…" : "Value…"}
          className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
    </div>
  );
}
