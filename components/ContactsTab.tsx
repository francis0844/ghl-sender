"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import useSWRInfinite from "swr/infinite";
import { Search, X, BookmarkPlus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contact";
import type { ContactFilter } from "@/types/filter";
import { FIELD_LABELS, OPERATOR_LABELS, VALUELESS_OPERATORS } from "@/types/filter";
import type { FilterField, FilterOperator } from "@/types/filter";
import type { ComposeTarget } from "@/app/page";
import SaveListSheet from "@/components/SaveListSheet";
import ContactFilterSheet from "@/components/ContactFilterSheet";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PAGE_SIZE = 20;

const EMPTY_FILTER: ContactFilter = { logic: "AND", groups: [] };

// Key types for useSWRInfinite: string for list mode, tuple for filter mode
type FilterKey = readonly ["filter", number, string, ContactFilter];
type PageKey = string | FilterKey;

type PageData = {
  contacts: Contact[];
  total: number;
  hasMore?: boolean;
};

async function fetcher(key: PageKey): Promise<PageData> {
  if (Array.isArray(key)) {
    const [, page, search, filterRules] = key as FilterKey;
    const res = await fetch(`${API_BASE}/api/contacts/filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        filter_rules: filterRules,
      }),
    });
    if (!res.ok) throw new Error("fetch failed");
    return res.json();
  }
  const res = await fetch(`${API_BASE}${key}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

interface Props {
  onCompose: (target: ComposeTarget) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function conditionChipLabel(
  field: FilterField,
  operator: FilterOperator,
  value?: string | boolean,
): string {
  const fl = FIELD_LABELS[field];
  const ol = OPERATOR_LABELS[operator];
  if (VALUELESS_OPERATORS.includes(operator)) return `${fl}: ${ol}`;
  const v = typeof value === "string" ? value : String(value ?? "");
  return `${fl}: "${v}"`;
}

export default function ContactsTab({ onCompose }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Applied filter (drives API calls); pending filter (in-progress edits in the sheet)
  const [appliedFilter, setAppliedFilter] = useState<ContactFilter>(EMPTY_FILTER);
  const [pendingFilter, setPendingFilter] = useState<ContactFilter>(EMPTY_FILTER);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Explicit per-contact selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // "Select all matching filter" mode (no IDs stored)
  const [filterSelMode, setFilterSelMode] = useState(false);

  const [saveSheetOpen, setSaveSheetOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  const isFiltered = appliedFilter.groups.length > 0;

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset selection when filters or search change
  useEffect(() => {
    setSelectedIds(new Set());
    setFilterSelMode(false);
  }, [debouncedSearch, appliedFilter]);

  const getKey = useCallback(
    (pageIndex: number, previousData: PageData | null): PageKey | null => {
      if (isFiltered) {
        if (previousData && previousData.hasMore === false) return null;
        return ["filter", pageIndex + 1, debouncedSearch, appliedFilter] as const;
      }
      if (previousData && previousData.contacts.length < PAGE_SIZE) return null;
      const qs = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch.length >= 1) qs.set("search", debouncedSearch);
      return `/api/contacts?${qs}`;
    },
    [debouncedSearch, isFiltered, appliedFilter],
  );

  const { data, error, size, setSize, isLoading, isValidating } =
    useSWRInfinite<PageData>(getKey, fetcher, { revalidateFirstPage: false });

  const contacts: Contact[] = useMemo(
    () => (data ? data.flatMap((d) => d.contacts ?? []) : []),
    [data],
  );

  const filteredTotal = isFiltered ? (data?.[0]?.total ?? null) : null;

  const lastPage = data?.[data.length - 1];
  const hasMore = isFiltered
    ? (lastPage?.hasMore === true)
    : ((lastPage?.contacts?.length ?? 0) >= PAGE_SIZE);

  const isLoadingMore = isValidating && size > 1;
  const rowCount = contacts.length + (hasMore ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Infinite scroll trigger
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= contacts.length - 1 && hasMore && !isLoadingMore) {
      setSize((s) => s + 1);
    }
  }, [virtualItems, contacts.length, hasMore, isLoadingMore, setSize]);

  const toggleSelect = useCallback((id: string) => {
    setFilterSelMode(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllLoaded = useCallback(() => {
    setFilterSelMode(false);
    setSelectedIds(new Set(contacts.map((c) => c.contactId)));
  }, [contacts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setFilterSelMode(false);
  }, []);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.contactId)),
    [contacts, selectedIds],
  );

  // Banner: all loaded contacts are selected, filter active, more exist beyond what's loaded
  const showSelectAllBanner =
    isFiltered &&
    !filterSelMode &&
    contacts.length > 0 &&
    selectedIds.size === contacts.length &&
    filteredTotal !== null &&
    filteredTotal > contacts.length;

  const hasSelection = selectedIds.size > 0 || filterSelMode;

  // Build filter chips for display
  const filterChips = useMemo(() => {
    const chips: { label: string; groupIdx: number; condIdx: number }[] = [];
    appliedFilter.groups.forEach((g, gi) => {
      g.conditions.forEach((c, ci) => {
        chips.push({
          label: conditionChipLabel(c.field, c.operator, c.value),
          groupIdx: gi,
          condIdx: ci,
        });
      });
    });
    return chips;
  }, [appliedFilter]);

  const removeFilterChip = useCallback(
    (groupIdx: number, condIdx: number) => {
      const groups = appliedFilter.groups
        .map((g, gi) => {
          if (gi !== groupIdx) return g;
          return { ...g, conditions: g.conditions.filter((_, ci) => ci !== condIdx) };
        })
        .filter((g) => g.conditions.length > 0);
      setAppliedFilter({ ...appliedFilter, groups });
    },
    [appliedFilter],
  );

  const openFilterSheet = useCallback(() => {
    setPendingFilter(appliedFilter);
    setFilterSheetOpen(true);
  }, [appliedFilter]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search bar + filter button */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="pl-9 pr-9"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={openFilterSheet}
            aria-label="Filter contacts"
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-xl border transition-colors shrink-0",
              isFiltered
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="shrink-0 px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 w-max items-center">
            {filterChips.map((chip) => (
              <span
                key={`${chip.groupIdx}-${chip.condIdx}`}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-foreground/10 text-xs font-medium text-foreground whitespace-nowrap"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeFilterChip(chip.groupIdx, chip.condIdx)}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="flex items-center justify-center w-4 h-4 rounded-full text-foreground/50 active:text-foreground"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setAppliedFilter(EMPTY_FILTER)}
              className="text-xs text-muted-foreground active:text-foreground px-1"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Filter match count + "Select all loaded" */}
      {isFiltered && !hasSelection && filteredTotal !== null && contacts.length > 0 && (
        <div className="shrink-0 px-4 pb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredTotal.toLocaleString()} contact{filteredTotal !== 1 ? "s" : ""} match
          </span>
          <button
            type="button"
            onClick={selectAllLoaded}
            className="text-xs font-semibold text-primary"
          >
            Select {contacts.length} loaded
          </button>
        </div>
      )}

      <div className="shrink-0 border-b border-border/50" />

      {/* Contact list */}
      {error && !data ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center py-20">
          <p className="text-sm font-medium text-destructive">Failed to load contacts</p>
          <p className="text-xs text-muted-foreground">
            Check that your GHL connection has the contacts.readonly scope.
          </p>
        </div>
      ) : isLoading && !data ? (
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded-full animate-pulse w-2/5" />
                <div className="h-3 bg-muted rounded-full animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 && !isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
          {isFiltered
            ? "No contacts match your filters"
            : debouncedSearch.length >= 1
              ? "No contacts found"
              : "No contacts"}
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualItems.map((item) => {
              if (item.index >= contacts.length) {
                return (
                  <div
                    key="loader"
                    style={{
                      position: "absolute",
                      top: item.start,
                      left: 0,
                      right: 0,
                      height: item.size,
                    }}
                    className="flex items-center justify-center"
                  >
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                  </div>
                );
              }

              const contact = contacts[item.index];
              const isSelected = filterSelMode || selectedIds.has(contact.contactId);

              return (
                <div
                  key={contact.contactId}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{ position: "absolute", top: item.start, left: 0, right: 0 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-border/50 cursor-pointer active:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/5",
                  )}
                  onClick={() => {
                    if (filterSelMode) return;
                    if (selectedIds.size > 0) toggleSelect(contact.contactId);
                    else onCompose({ type: "contacts", contacts: [contact] });
                  }}
                >
                  <button
                    type="button"
                    aria-label={isSelected ? "Deselect" : "Select"}
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors",
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (filterSelMode) {
                        setFilterSelMode(false);
                      } else {
                        toggleSelect(contact.contactId);
                      }
                    }}
                  >
                    {isSelected ? "✓" : getInitials(contact.name)}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.phone ?? contact.email ?? "No contact info"}
                      </p>
                      {contact.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium leading-none"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isSelected && selectedIds.size === 0 && !filterSelMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompose({ type: "contacts", contacts: [contact] });
                      }}
                      className="text-xs text-primary font-semibold px-3 py-1.5 rounded-full border border-primary/30 active:bg-primary/10 shrink-0"
                    >
                      Send
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "Select all matching" banner */}
      {showSelectAllBanner && (
        <div className="shrink-0 mx-4 mb-2 mt-1 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
          <p className="text-xs text-foreground">
            All {contacts.length} loaded contacts selected
          </p>
          <button
            type="button"
            onClick={() => setFilterSelMode(true)}
            className="text-xs font-semibold text-primary shrink-0"
          >
            Select all {filteredTotal?.toLocaleString()}
          </button>
        </div>
      )}

      {/* Sticky bottom action bar */}
      {hasSelection && (
        <div
          className="shrink-0 px-4 py-3 bg-card border-t border-border flex items-center gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <span className="text-sm font-medium text-foreground flex-1">
            {filterSelMode
              ? `All ${filteredTotal?.toLocaleString() ?? "…"} selected`
              : `${selectedIds.size} selected`}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-muted-foreground px-2 py-1"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={filterSelMode}
            onClick={() => !filterSelMode && setSaveSheetOpen(true)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border border-border text-foreground active:bg-muted transition-colors",
              filterSelMode && "opacity-40",
            )}
          >
            <BookmarkPlus size={14} />
            Save List
          </button>
          <button
            type="button"
            disabled={filterSelMode}
            onClick={() => {
              if (!filterSelMode)
                onCompose({ type: "contacts", contacts: selectedContacts });
            }}
            className={cn(
              "bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-full active:opacity-80 transition-opacity",
              filterSelMode && "opacity-40",
            )}
          >
            {filterSelMode ? "Send (next phase)" : `Send ${selectedIds.size}`}
          </button>
        </div>
      )}

      <SaveListSheet
        isOpen={saveSheetOpen}
        contacts={selectedContacts}
        onClose={() => setSaveSheetOpen(false)}
        onSaved={() => {
          setSaveSheetOpen(false);
          clearSelection();
        }}
      />

      <ContactFilterSheet
        isOpen={filterSheetOpen}
        filter={pendingFilter}
        onFilterChange={setPendingFilter}
        onClose={() => setFilterSheetOpen(false)}
        onApply={() => {
          setAppliedFilter(pendingFilter);
          setFilterSheetOpen(false);
        }}
        onClear={() => setPendingFilter(EMPTY_FILTER)}
      />
    </div>
  );
}
