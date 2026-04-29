"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterGroup, FilterCondition } from "@/types/filter";
import FilterRuleRow from "./FilterRuleRow";

interface Props {
  group: FilterGroup;
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
}

function newCondition(): FilterCondition {
  return { id: crypto.randomUUID(), field: "name", operator: "contains", value: "" };
}

export default function FilterGroupBuilder({ group, onChange, onRemove }: Props) {
  const updateCondition = (index: number, cond: FilterCondition) => {
    const conditions = group.conditions.map((c, i) => (i === index ? cond : c));
    onChange({ ...group, conditions });
  };

  const removeCondition = (index: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Match
        </span>
        {(["AND", "OR"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange({ ...group, logic: l })}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              group.logic === l
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground",
            )}
          >
            {l === "AND" ? "All rules" : "Any rule"}
          </button>
        ))}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto text-xs text-destructive font-medium"
          >
            Remove group
          </button>
        )}
      </div>

      {group.conditions.map((cond, i) => (
        <FilterRuleRow
          key={cond.id}
          condition={cond}
          onChange={(c) => updateCondition(i, c)}
          onRemove={() => removeCondition(i)}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange({ ...group, conditions: [...group.conditions, newCondition()] })}
        className="flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground active:bg-muted transition-colors"
      >
        <Plus size={14} />
        Add rule
      </button>
    </div>
  );
}
