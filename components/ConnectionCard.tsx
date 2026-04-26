"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Check, RefreshCw, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GHLConnection } from "@/types/ghl-connection";

function relativeTime(iso: string | null): string {
  if (!iso) return "Never used";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

interface Props {
  connection: GHLConnection;
  onSetActive: () => void;
  onRename: (newLabel: string) => void;
  onReconnect: () => void;
  onDisconnect: () => void;
}

export default function ConnectionCard({
  connection,
  onSetActive,
  onRename,
  onReconnect,
  onDisconnect,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(connection.account_label);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [menuOpen]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renaming]);

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== connection.account_label) {
      onRename(trimmed);
    } else {
      setRenameValue(connection.account_label);
    }
    setRenaming(false);
  };

  const avatar = connection.account_label.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-4 transition-colors",
        connection.is_active
          ? "border-emerald-400 shadow-[inset_3px_0_0_0_rgb(52_211_153)]"
          : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold",
            connection.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground"
          )}
        >
          {avatar}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          {renaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") {
                  setRenameValue(connection.account_label);
                  setRenaming(false);
                }
              }}
              className="w-full text-sm font-semibold text-foreground bg-muted rounded-lg px-2 py-1 outline-none ring-2 ring-primary"
              style={{ fontSize: "16px" }}
            />
          ) : (
            <p className="text-sm font-semibold text-foreground leading-snug truncate">
              {connection.account_label}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {connection.location_id}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last used: {relativeTime(connection.last_used_at)}
          </p>
        </div>

        {/* Active badge + overflow menu */}
        <div className="flex items-center gap-2 shrink-0">
          {connection.is_active ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetActive}
              className="text-xs font-semibold border border-border rounded-full px-2.5 py-1 text-foreground active:bg-muted transition-colors"
            >
              Set Active
            </button>
          )}

          {/* Overflow menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account options"
              className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-30 w-44 bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setRenaming(true); setRenameValue(connection.account_label); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground active:bg-muted transition-colors"
                >
                  <Pencil size={14} aria-hidden className="text-muted-foreground" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onReconnect(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground border-t border-border active:bg-muted transition-colors"
                >
                  <RefreshCw size={14} aria-hidden className="text-muted-foreground" />
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDisconnect(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive border-t border-border active:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} aria-hidden />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {connection.is_active && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
          <Check size={12} aria-hidden />
          <span>This account is used for all contact searches and messages</span>
        </div>
      )}
    </div>
  );
}
