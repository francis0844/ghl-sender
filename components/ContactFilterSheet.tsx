"use client";

import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import FilterGroupBuilder from "./FilterGroupBuilder";
import type { ContactFilter, FilterGroup, FilterCondition } from "@/types/filter";

interface Props {
  isOpen: boolean;
  filter: ContactFilter;
  onFilterChange: (filter: ContactFilter) => void;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
}

function newGroup(): FilterGroup {
  return {
    id: crypto.randomUUID(),
    logic: "AND",
    conditions: [{ id: crypto.randomUUID(), field: "name", operator: "contains", value: "" } as FilterCondition],
  };
}

export default function ContactFilterSheet({
  isOpen,
  filter,
  onFilterChange,
  onClose,
  onApply,
  onClear,
}: Props) {
  const updateGroup = (index: number, group: FilterGroup) => {
    const groups = filter.groups.map((g, i) => (i === index ? group : g));
    onFilterChange({ ...filter, groups });
  };

  const removeGroup = (index: number) => {
    const groups = filter.groups.filter((_, i) => i !== index);
    onFilterChange({ ...filter, groups });
  };

  const addGroup = () => {
    onFilterChange({ ...filter, groups: [...filter.groups, newGroup()] });
  };

  const footer = (
    <div className="px-5 pt-3 pb-4 flex gap-3 border-t border-border">
      <button
        type="button"
        onClick={onClear}
        className="flex-1 h-12 rounded-2xl border border-border text-sm font-semibold text-foreground active:bg-muted transition-colors"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-[2] h-12 rounded-2xl bg-foreground text-background text-sm font-semibold active:opacity-80 transition-opacity"
      >
        Apply Filters
      </button>
    </div>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter Contacts" footer={footer}>
      <div className="px-5 pb-4 flex flex-col gap-4">
        {filter.groups.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              No filters yet. Add a rule to start filtering contacts.
            </p>
            <button
              type="button"
              onClick={addGroup}
              className="px-5 py-2.5 rounded-2xl bg-foreground text-background text-sm font-semibold active:opacity-80"
            >
              Add Filter Rule
            </button>
          </div>
        ) : (
          <>
            {filter.groups.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Between groups
                </span>
                {(["AND", "OR"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onFilterChange({ ...filter, logic: l })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                      filter.logic === l
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground",
                    )}
                  >
                    {l === "AND" ? "All groups" : "Any group"}
                  </button>
                ))}
              </div>
            )}

            {filter.groups.map((group, i) => (
              <div key={group.id}>
                {i > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs font-semibold text-muted-foreground px-2">
                      {filter.logic}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                )}
                <FilterGroupBuilder
                  group={group}
                  onChange={(g) => updateGroup(i, g)}
                  onRemove={filter.groups.length > 1 ? () => removeGroup(i) : undefined}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addGroup}
              className="flex items-center justify-center gap-1.5 w-full h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground active:bg-muted transition-colors"
            >
              + Add filter group
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
