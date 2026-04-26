"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import type { GHLConnection } from "@/types/ghl-connection";

interface Props {
  /** Called after successfully switching the active connection. */
  onSwitch?: (connection: GHLConnection) => void;
}

export default function AccountSwitcher({ onSwitch }: Props) {
  const [connections, setConnections] = useState<GHLConnection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .catch(() => {});
  }, []);

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
        onClick={() => connections.length > 1 && setIsOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors",
          "text-foreground active:bg-muted",
          connections.length <= 1 && "pointer-events-none"
        )}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
        <span className="max-w-[160px] truncate">
          {active?.account_label ?? "No account"}
        </span>
        {connections.length > 1 && (
          <ChevronDown size={14} aria-hidden className="text-muted-foreground shrink-0" />
        )}
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Switch Account"
      >
        <ul className="px-4 pb-2 flex flex-col gap-1">
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
      </BottomSheet>
    </>
  );
}
