"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Check, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { GHLConnection } from "@/types/ghl-connection";

interface Props {
  onSwitch?: (connection: GHLConnection) => void;
}

export default function AccountSwitcher({ onSwitch }: Props) {
  const [connections, setConnections] = useState<GHLConnection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const loadConnections = useCallback(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .catch(() => {});
  }, []);

  // Load on mount
  useEffect(() => { loadConnections(); }, [loadConnections]);

  // Reload every time the sheet opens so newly added accounts appear
  const handleOpen = () => {
    loadConnections();
    setIsOpen(true);
  };

  const active = connections.find((c) => c.is_active);

  const handleSwitch = async (connection: GHLConnection) => {
    if (connection.is_active || isSwitching) return;
    setIsSwitching(true);
    setIsOpen(false);

    try {
      const res = await fetch("/api/auth/ghl/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id }),
      });
      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) => ({ ...c, is_active: c.id === connection.id }))
        );
        onSwitch?.(connection);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  if (connections.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-foreground active:bg-muted transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="max-w-[160px] truncate">
          {active?.account_label ?? "No account"}
        </span>
        <ChevronDown size={14} aria-hidden className="text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden
            style={{ animation: "overlay-in 0.15s ease-out" }}
          />
          <div
            className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden"
            style={{ animation: "sheet-up 0.2s ease-out" }}
            role="dialog"
            aria-modal="true"
            aria-label="Switch Account"
          >
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-semibold text-foreground">Switch Account</p>
            </div>

            <ul className="px-3 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
              {connections.map((conn) => (
                <li key={conn.id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(conn)}
                    disabled={isSwitching}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3 min-h-[56px] text-left transition-colors",
                      conn.is_active
                        ? "bg-emerald-50 text-emerald-800"
                        : "active:bg-muted text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                        conn.is_active
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {conn.account_label.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{conn.account_label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {conn.location_id}
                      </p>
                    </div>
                    {conn.is_active && (
                      <Check size={16} aria-hidden className="text-emerald-600 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="px-3 pt-2 pb-3 border-t border-border mt-2">
              <Link
                href="/connections"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-muted-foreground active:bg-muted transition-colors"
              >
                <Settings size={15} aria-hidden />
                Manage accounts
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
