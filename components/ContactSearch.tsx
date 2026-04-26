"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Phone, Mail, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contact";
import ComposeMessage from "@/components/ComposeMessage";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// In Capacitor production builds set NEXT_PUBLIC_API_BASE_URL to the
// deployed server URL; leave empty for dev / web server usage.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function ContactSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when the user taps/clicks outside it
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  // Fire search whenever the debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;

    const doSearch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/contacts/search?query=${encodeURIComponent(debouncedQuery)}`
        );
        if (!res.ok) throw new Error("Search failed");
        const data: { contacts: Contact[] } = await res.json();
        if (!cancelled) {
          setResults(data.contacts ?? []);
          setIsOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    doSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = (contact: Contact) => {
    setSelected(contact);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleClearSelected = () => {
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Search input + results dropdown ── */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search
            size={18}
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            type="search"
            placeholder="Search contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {isLoading && (
            <Loader2
              size={16}
              aria-hidden
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Contact results"
            className="absolute z-20 left-0 right-0 mt-1.5 rounded-2xl border border-border bg-card shadow-lg overflow-hidden"
          >
            {results.length > 0 ? (
              results.map((contact, idx) => (
                <button
                  key={contact.contactId}
                  role="option"
                  aria-selected={false}
                  type="button"
                  onClick={() => handleSelect(contact)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 min-h-[56px] flex flex-col justify-center",
                    "active:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    "transition-colors",
                    idx < results.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="font-medium text-sm leading-snug text-foreground">
                    {contact.name}
                  </span>
                  {contact.phone && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {contact.phone}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                No contacts found
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Selected contact card ── */}
      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User size={18} aria-hidden className="text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold leading-tight text-card-foreground truncate">
                  {selected.name}
                </h2>
              </div>
              {/* 48×48 tap target for the dismiss button */}
              <button
                type="button"
                onClick={handleClearSelected}
                aria-label="Clear selected contact"
                className="h-12 w-12 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors shrink-0"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <ul className="space-y-1">
              {selected.phone && (
                <li className="flex items-center gap-3">
                  <Phone
                    size={15}
                    aria-hidden
                    className="text-muted-foreground shrink-0"
                  />
                  <a
                    href={`tel:${selected.phone}`}
                    className="text-sm text-foreground min-h-[48px] flex items-center"
                  >
                    {selected.phone}
                  </a>
                </li>
              )}
              {selected.email && (
                <li className="flex items-center gap-3">
                  <Mail
                    size={15}
                    aria-hidden
                    className="text-muted-foreground shrink-0"
                  />
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm text-foreground min-h-[48px] flex items-center break-all"
                  >
                    {selected.email}
                  </a>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Compose + send flow (shown once a contact is selected) ── */}
      {selected && <ComposeMessage contact={selected} />}
    </div>
  );
}
