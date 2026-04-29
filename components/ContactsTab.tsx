"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import useSWRInfinite from "swr/infinite";
import { Search, X, BookmarkPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contact";
import type { ComposeTarget } from "@/app/page";
import SaveListSheet from "@/components/SaveListSheet";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PAGE_SIZE = 20;

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

interface Props {
  onCompose: (target: ComposeTarget) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function ContactsTab({ onCompose }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset selection when filters change
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, activeTag]);

  const getKey = useCallback(
    (pageIndex: number, previousData: { contacts: Contact[] } | null) => {
      if (previousData && previousData.contacts.length < PAGE_SIZE) return null;
      const qs = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch.length >= 1) qs.set("search", debouncedSearch);
      if (activeTag) qs.set("tag", activeTag);
      return `/api/contacts?${qs}`;
    },
    [debouncedSearch, activeTag]
  );

  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite<{
    contacts: Contact[];
    total: number;
  }>(getKey, fetcher, { revalidateFirstPage: false });

  const contacts: Contact[] = useMemo(
    () => (data ? data.flatMap((d) => d.contacts ?? []) : []),
    [data]
  );

  // Collect unique tags from all loaded contacts
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const page of data ?? []) {
      for (const c of page.contacts ?? []) {
        for (const t of c.tags) tagSet.add(t);
      }
    }
    return [...tagSet].sort();
  }, [data]);

  const hasMore = (data?.[data.length - 1]?.contacts?.length ?? 0) >= PAGE_SIZE;
  const isLoadingMore = isValidating && size > 1;

  const rowCount = contacts.length + (hasMore ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= contacts.length - 1 && hasMore && !isLoadingMore) {
      setSize((s) => s + 1);
    }
  }, [virtualItems, contacts.length, hasMore, isLoadingMore, setSize]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.contactId)),
    [contacts, selected]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
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
      </div>

      {/* Tag filter chips */}
      {availableTags.length > 0 && (
        <div className="shrink-0 px-4 pb-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
                !activeTag
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
                  activeTag === tag
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {activeTag
            ? `No contacts tagged "${activeTag}"`
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
                    style={{ position: "absolute", top: item.start, left: 0, right: 0, height: item.size }}
                    className="flex items-center justify-center"
                  >
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                  </div>
                );
              }

              const contact = contacts[item.index];
              const isSelected = selected.has(contact.contactId);

              return (
                <div
                  key={contact.contactId}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  style={{ position: "absolute", top: item.start, left: 0, right: 0 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-border/50 cursor-pointer active:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (selected.size > 0) toggleSelect(contact.contactId);
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
                        : "bg-muted text-muted-foreground"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(contact.contactId);
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

                  {!isSelected && selected.size === 0 && (
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

      {/* Selection bar */}
      {selected.size > 0 && (
        <div
          className="shrink-0 px-4 py-3 bg-card border-t border-border flex items-center gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <span className="text-sm font-medium text-foreground flex-1">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted-foreground px-2 py-1"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setSaveSheetOpen(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border border-border text-foreground active:bg-muted transition-colors"
          >
            <BookmarkPlus size={14} />
            Save List
          </button>
          <button
            type="button"
            onClick={() => onCompose({ type: "contacts", contacts: selectedContacts })}
            className="bg-foreground text-background text-sm font-semibold px-4 py-2 rounded-full active:opacity-80 transition-opacity"
          >
            Send {selected.size}
          </button>
        </div>
      )}

      <SaveListSheet
        isOpen={saveSheetOpen}
        contacts={selectedContacts}
        onClose={() => setSaveSheetOpen(false)}
        onSaved={() => {
          setSaveSheetOpen(false);
          setSelected(new Set());
        }}
      />
    </div>
  );
}
