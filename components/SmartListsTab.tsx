"use client";

import { useState } from "react";
import useSWR from "swr";
import { List, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contact";
import type { ComposeTarget } from "@/app/page";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type SmartList = {
  id: string;
  name: string;
  description?: string;
  contactsCount?: number;
};

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

interface Props {
  onCompose: (target: ComposeTarget) => void;
}

export default function SmartListsTab({ onCompose }: Props) {
  const { data, isLoading, error } = useSWR<{ smartLists: SmartList[] }>(
    "/api/smart-lists",
    fetcher
  );

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSend = async (list: SmartList) => {
    setLoadingId(list.id);
    setLoadError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/smart-lists/${encodeURIComponent(list.id)}/contacts`
      );
      if (!res.ok) throw new Error("Failed to load contacts");
      const json: { contacts: Contact[] } = await res.json();
      if (!json.contacts.length) {
        setLoadError("No contacts found in this list.");
        return;
      }
      onCompose({
        type: "smart-list",
        smartListId: list.id,
        smartListName: list.name,
        contacts: json.contacts,
      });
    } catch {
      setLoadError("Failed to load contacts. Try again.");
    } finally {
      setLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-muted rounded-full animate-pulse w-2/5" />
              <div className="h-3 bg-muted rounded-full animate-pulse w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
        Failed to load filters.
      </div>
    );
  }

  const lists = data?.smartLists ?? [];

  if (lists.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 px-6 text-center">
        <List size={32} className="opacity-30" />
        <p className="text-sm">No smart lists found in your GHL account.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {loadError && (
        <div className="shrink-0 px-4 py-2 bg-destructive/10 text-destructive text-xs text-center">
          {loadError}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
      {lists.map((list, idx) => (
        <div
          key={list.id}
          className={cn(
            "flex items-center gap-3 px-4 py-4 border-b border-border/50",
            idx === lists.length - 1 && "border-b-0"
          )}
        >
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <List size={18} className="text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{list.name}</p>
            {list.description && (
              <p className="text-xs text-muted-foreground truncate">{list.description}</p>
            )}
          </div>

          <button
            type="button"
            disabled={loadingId === list.id}
            onClick={() => handleSend(list)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 transition-opacity",
              loadingId === list.id
                ? "border-muted text-muted-foreground opacity-60"
                : "border-primary/30 text-primary active:bg-primary/10"
            )}
          >
            {loadingId === list.id ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </>
            ) : (
              <>
                Send to List
                <ChevronRight size={12} />
              </>
            )}
          </button>
        </div>
      ))}
      </div>
    </div>
  );
}
