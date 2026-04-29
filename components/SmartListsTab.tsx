"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  List,
  Filter,
  Users,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import type { Contact } from "@/types/contact";
import type { AppSmartListSummary } from "@/types/smart-list";
import type { ComposeTarget } from "@/app/page";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(sourceType: string) {
  if (sourceType === "local_dynamic") return "Dynamic";
  if (sourceType === "local_manual") return "Manual";
  return "Imported";
}

function typeColor(sourceType: string) {
  if (sourceType === "local_dynamic")
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (sourceType === "local_manual")
    return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

interface Props {
  onCompose: (target: ComposeTarget) => void;
  connectionId?: string | null;
}

export default function SmartListsTab({ onCompose, connectionId }: Props) {
  const key = `/api/smart-lists${connectionId ? `?c=${connectionId}` : ""}`;
  const { data, isLoading, error, mutate } = useSWR<{
    appSmartLists: AppSmartListSummary[];
    importedGhlSmartLists: unknown[];
  }>(key, fetcher);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<AppSmartListSummary | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleSend = useCallback(
    async (list: AppSmartListSummary) => {
      setLoadingId(list.id);
      setLoadError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/smart-lists/${encodeURIComponent(list.id)}/contacts`,
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
    },
    [onCompose],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await fetch(`${API_BASE}/api/smart-lists/${id}`, { method: "DELETE" });
        mutate();
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    },
    [mutate],
  );

  const handleRename = useCallback(
    async () => {
      if (!renameTarget || !renameName.trim() || renaming) return;
      setRenaming(true);
      try {
        const res = await fetch(`${API_BASE}/api/smart-lists/${renameTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: renameName.trim() }),
        });
        if (res.ok) {
          mutate();
          setRenameTarget(null);
          setRenameName("");
        }
      } finally {
        setRenaming(false);
      }
    },
    [renameTarget, renameName, renaming, mutate],
  );

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
        Failed to load smart lists.
      </div>
    );
  }

  const appLists = data?.appSmartLists ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {loadError && (
        <div className="shrink-0 px-4 py-2 bg-destructive/10 text-destructive text-xs text-center">
          {loadError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* App Smart Lists section */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            App Smart Lists
          </p>
        </div>

        {appLists.length === 0 ? (
          <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
            <List size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No smart lists yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Select contacts in the Contacts tab to create your first Smart List.
            </p>
          </div>
        ) : (
          appLists.map((list) => (
            <div
              key={list.id}
              className="px-4 py-3 border-b border-border/50"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  {list.source_type === "local_dynamic" ? (
                    <Filter size={16} className="text-muted-foreground" />
                  ) : (
                    <Users size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-muted-foreground truncate mb-1">{list.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        typeColor(list.source_type),
                      )}
                    >
                      {typeLabel(list.source_type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {list.cached_contact_count.toLocaleString()} contact{list.cached_contact_count !== 1 ? "s" : ""}
                    </span>
                    {list.source_type === "local_dynamic" && (
                      <span className="text-xs text-muted-foreground">
                        · Refreshed {formatDate(list.last_refreshed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-2.5 flex items-center gap-1 pl-13">
                <Link
                  href={`/smart-lists/${list.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground px-2.5 py-1.5 rounded-lg active:bg-muted transition-colors"
                >
                  View
                  <ChevronRight size={11} />
                </Link>

                <button
                  type="button"
                  disabled={loadingId === list.id}
                  onClick={() => handleSend(list)}
                  className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors",
                    loadingId === list.id
                      ? "text-muted-foreground opacity-60"
                      : "text-primary active:bg-primary/10",
                  )}
                >
                  {loadingId === list.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : null}
                  Send
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRenameTarget(list);
                    setRenameName(list.name);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground px-2.5 py-1.5 rounded-lg active:bg-muted transition-colors"
                >
                  <Pencil size={11} />
                  Rename
                </button>

                {confirmDeleteId === list.id ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-muted-foreground px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === list.id}
                      onClick={() => handleDelete(list.id)}
                      className="text-xs font-semibold text-destructive px-2.5 py-1.5 rounded-lg active:bg-destructive/10"
                    >
                      {deletingId === list.id ? "Deleting…" : "Confirm Delete"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(list.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground px-2.5 py-1.5 rounded-lg active:bg-muted ml-auto transition-colors"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {/* Imported GHL Smart Lists section */}
        <div className="px-4 pt-5 pb-2 border-t border-border/30 mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Imported GHL Lists
          </p>
        </div>
        <div className="px-4 py-6 flex flex-col items-center gap-2 text-center">
          <Download size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No imported lists.</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            GHL does not expose saved smart lists via its public API. This section will
            populate if import support is added in a future update.
          </p>
        </div>
      </div>

      {/* Rename sheet */}
      <BottomSheet
        isOpen={!!renameTarget}
        onClose={() => {
          setRenameTarget(null);
          setRenameName("");
        }}
        title="Rename List"
        footer={
          <div className="px-5 pt-3 pb-4 border-t border-border">
            <button
              type="button"
              disabled={!renameName.trim() || renaming}
              onClick={handleRename}
              className="w-full h-12 rounded-2xl bg-foreground text-background text-sm font-semibold active:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {renaming ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="px-5 pb-4">
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoComplete="off"
            autoFocus
          />
        </div>
      </BottomSheet>
    </div>
  );
}
