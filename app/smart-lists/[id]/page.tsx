"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  Filter,
  Users,
  RefreshCw,
  Pencil,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import ComposeSheet from "@/components/ComposeSheet";
import type { AppSmartList } from "@/types/smart-list";
import type { Contact } from "@/types/contact";
import type { ComposeTarget } from "@/app/page";
import { FIELD_LABELS, OPERATOR_LABELS, VALUELESS_OPERATORS } from "@/types/filter";
import type { FilterField, FilterOperator, ContactFilter } from "@/types/filter";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function filterSummary(filter: ContactFilter): string {
  if (!filter?.groups?.length) return "No filter rules";
  const parts = filter.groups.map((g) => {
    const condParts = g.conditions.map((c) => {
      const fl = FIELD_LABELS[c.field as FilterField] ?? c.field;
      const ol = OPERATOR_LABELS[c.operator as FilterOperator] ?? c.operator;
      if (VALUELESS_OPERATORS.includes(c.operator as FilterOperator)) return `${fl} ${ol}`;
      const v = typeof c.value === "string" ? c.value : String(c.value ?? "");
      return `${fl} ${ol} "${v}"`;
    });
    return condParts.join(` ${g.logic} `);
  });
  return parts.join(` ${filter.logic} `);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function SmartListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error, mutate } = useSWR<{ smartList: AppSmartList }>(
    id ? `/api/smart-lists/${id}` : null,
    fetcher,
  );
  const smartList = data?.smartList;

  // Manual contacts (loaded once)
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (smartList?.source_type === "local_manual" && contacts === null) {
      setLoadingContacts(true);
      fetch(`${API_BASE}/api/smart-lists/${id}/contacts`)
        .then((r) => r.json())
        .then((d) => setContacts(d.contacts ?? []))
        .catch(() => setContacts([]))
        .finally(() => setLoadingContacts(false));
    }
  }, [smartList, id, contacts]);

  // Actions
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleRefresh = async () => {
    if (!smartList || refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/smart-lists/${id}/refresh`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setRefreshCount(d.count);
        mutate();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSend = async () => {
    if (!smartList || sending) return;
    if (contacts && contacts.length > 0) {
      setComposeTarget({ type: "smart-list", smartListId: id, smartListName: smartList.name, contacts });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/smart-lists/${id}/contacts`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.contacts?.length) {
        setComposeTarget({
          type: "smart-list",
          smartListId: id,
          smartListName: smartList.name,
          contacts: d.contacts,
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/api/smart-lists/${id}`, { method: "DELETE" });
      router.replace("/");
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!renameName.trim() || renaming) return;
    setRenaming(true);
    try {
      const res = await fetch(`${API_BASE}/api/smart-lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      if (res.ok) {
        mutate();
        setRenameOpen(false);
        setRenameName("");
      }
    } finally {
      setRenaming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header
          className="sticky top-0 z-10 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div className="flex items-center gap-2 px-4 pb-3">
            <Link href="/" className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-5 bg-muted rounded-full animate-pulse w-32" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !smartList) {
    return (
      <div className="flex flex-col h-full">
        <header
          className="sticky top-0 z-10 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div className="flex items-center gap-2 px-4 pb-3">
            <Link href="/" className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted">
              <ArrowLeft size={18} />
            </Link>
            <p className="text-base font-semibold text-foreground">Smart List</p>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
          List not found or was deleted.
        </div>
      </div>
    );
  }

  const isDynamic = smartList.source_type === "local_dynamic";
  const count = refreshCount ?? smartList.cached_contact_count;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-10 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center gap-2 px-4 pb-3">
          <Link
            href="/"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{smartList.name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRenameOpen(true);
              setRenameName(smartList.name);
            }}
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
            aria-label="Rename"
          >
            <Pencil size={16} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted-foreground px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="text-xs font-semibold text-destructive px-2 py-1 rounded-lg"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Metadata card */}
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-2xl bg-muted/40 px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                {isDynamic ? (
                  <Filter size={18} className="text-muted-foreground" />
                ) : (
                  <Users size={18} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isDynamic ? "Dynamic List" : "Manual List"}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {count.toLocaleString()} contact{count !== 1 ? "s" : ""}
                </p>
              </div>
              {isDynamic && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-muted-foreground active:bg-muted transition-colors"
                  aria-label="Refresh count"
                >
                  <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
                </button>
              )}
            </div>

            {smartList.description && (
              <p className="text-sm text-muted-foreground">{smartList.description}</p>
            )}

            {isDynamic && (
              <>
                <div className="text-xs text-muted-foreground">
                  Last refreshed: {formatDate(smartList.last_refreshed_at)}
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">Filter rules</p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {filterSummary(smartList.filter_rules as ContactFilter)}
                  </p>
                </div>
              </>
            )}

            {smartList.account_label && (
              <p className="text-xs text-muted-foreground">Account: {smartList.account_label}</p>
            )}
          </div>
        </div>

        {/* Contacts section (manual only) */}
        {!isDynamic && (
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2">
              Contacts
            </p>
            {loadingContacts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : contacts && contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No contacts saved.</p>
            ) : (
              contacts?.map((contact) => (
                <div
                  key={contact.contactId}
                  className="flex items-center gap-3 py-3 border-b border-border/40"
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                    {getInitials(contact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.phone ?? contact.email ?? "No contact info"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isDynamic && (
          <div className="px-4 pt-2 pb-6">
            <p className="text-xs text-muted-foreground text-center">
              Contacts resolve dynamically when you send. Use the Refresh button to update the count.
            </p>
          </div>
        )}
      </div>

      {/* Send button */}
      <div
        className="shrink-0 px-4 py-3 bg-card border-t border-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-foreground text-background text-sm font-semibold active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          {sending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Loading contacts…
            </>
          ) : (
            <>
              <Send size={15} />
              Send to List
            </>
          )}
        </button>
      </div>

      {/* Rename sheet */}
      <BottomSheet
        isOpen={renameOpen}
        onClose={() => {
          setRenameOpen(false);
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

      {composeTarget && (
        <ComposeSheet
          isOpen={true}
          target={composeTarget}
          onClose={() => setComposeTarget(null)}
        />
      )}
    </div>
  );
}
