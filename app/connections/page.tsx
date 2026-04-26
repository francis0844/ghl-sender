"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Link2Off, X } from "lucide-react";
import ConnectionCard from "@/components/ConnectionCard";
import AddConnectionSheet from "@/components/AddConnectionSheet";
import { cn } from "@/lib/utils";
import type { GHLConnection } from "@/types/ghl-connection";

interface ToastState {
  type: "success" | "error";
  text: string;
}

interface ConfirmState {
  connectionId: string;
  label: string;
}

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [connections, setConnections] = useState<GHLConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      setConnections(data.connections ?? []);
    } catch {
      showToast("error", "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadConnections(); }, [loadConnections]);

  // Handle OAuth callback query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      showToast("success", "Account connected successfully");
      loadConnections();
      router.replace("/connections");
    } else if (error) {
      const messages: Record<string, string> = {
        invalid_request: "Invalid OAuth request",
        invalid_state: "Security check failed — please try again",
        state_mismatch: "Security check failed — please try again",
        token_exchange_failed: "Failed to exchange OAuth code",
        incomplete_token: "Incomplete response from GHL",
      };
      showToast("error", messages[error] ?? `Connection failed: ${error}`);
      router.replace("/connections");
    }
  }, [searchParams, showToast, loadConnections, router]);

  const handleSetActive = async (connectionId: string) => {
    const res = await fetch("/api/auth/ghl/set-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    if (res.ok) {
      setConnections((prev) =>
        prev.map((c) => ({ ...c, is_active: c.id === connectionId }))
      );
      const label = connections.find((c) => c.id === connectionId)?.account_label;
      showToast("success", `Switched to ${label}`);
    } else {
      showToast("error", "Failed to switch account");
    }
  };

  const handleRename = async (connectionId: string, newLabel: string) => {
    const res = await fetch("/api/connections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: connectionId, account_label: newLabel }),
    });
    if (res.ok) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, account_label: newLabel } : c
        )
      );
    } else {
      showToast("error", "Rename failed");
    }
  };

  const handleReconnect = (connection: GHLConnection) => {
    const params = `?label=${encodeURIComponent(connection.account_label)}`;
    window.location.assign(`/api/auth/ghl/connect${params}`);
  };

  const confirmDisconnect = async () => {
    if (!confirm) return;
    const res = await fetch("/api/auth/ghl/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: confirm.connectionId }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnections((prev) => {
        const filtered = prev.filter((c) => c.id !== confirm.connectionId);
        if (data.newActiveId) {
          return filtered.map((c) => ({
            ...c,
            is_active: c.id === data.newActiveId,
          }));
        }
        return filtered;
      });
      showToast("success", `${confirm.label} disconnected`);
    } else {
      showToast("error", "Disconnect failed");
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 pb-4 border-b border-border bg-card/90 backdrop-blur-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              GoHighLevel Accounts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect one or more GHL locations and switch between them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-foreground text-background text-sm font-semibold px-3 py-2 rounded-xl active:opacity-80 transition-opacity shrink-0"
          >
            <Plus size={15} aria-hidden />
            Add
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {loading ? (
          /* Skeleton */
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-muted rounded-full animate-pulse w-3/5" />
                    <div className="h-3 bg-muted rounded-full animate-pulse w-2/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : connections.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center text-center pt-20 pb-10 gap-5">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <Link2Off size={32} aria-hidden className="text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                No accounts connected
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Connect your first GoHighLevel account to start searching
                contacts and sending messages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 bg-foreground text-background text-base font-semibold px-6 min-h-[56px] rounded-2xl active:opacity-80 transition-opacity"
            >
              <Plus size={18} aria-hidden />
              Connect GoHighLevel Account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onSetActive={() => handleSetActive(conn.id)}
                onRename={(label) => handleRename(conn.id, label)}
                onReconnect={() => handleReconnect(conn)}
                onDisconnect={() => setConfirm({ connectionId: conn.id, label: conn.account_label })}
              />
            ))}

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-medium min-h-[56px] active:bg-muted transition-colors"
            >
              <Plus size={16} aria-hidden />
              Add another account
            </button>
          </div>
        )}
      </main>

      {/* Add connection sheet */}
      <AddConnectionSheet isOpen={addOpen} onClose={() => setAddOpen(false)} />

      {/* Disconnect confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirm(null)}
            aria-hidden
            style={{ animation: "overlay-in 0.15s ease-out" }}
          />
          <div
            className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl p-6"
            style={{ animation: "sheet-up 0.2s ease-out" }}
            role="alertdialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-foreground mb-2">
              Disconnect &ldquo;{confirm.label}&rdquo;?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This removes the connection and its stored credentials. You can
              reconnect at any time.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 min-h-[48px] rounded-xl border border-border text-sm font-semibold text-foreground active:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDisconnect}
                className="flex-1 min-h-[48px] rounded-xl bg-destructive text-white text-sm font-semibold active:opacity-80 transition-opacity"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "fixed left-4 right-4 z-50 flex items-start justify-between gap-3",
            "px-4 py-3.5 rounded-2xl shadow-xl text-sm font-medium",
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          )}
          style={{
            bottom: "calc(max(env(safe-area-inset-bottom, 0px), 0px) + 20px)",
            animation: "toast-up 0.22s ease-out",
          }}
        >
          <span className="flex-1 leading-snug">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center opacity-80 active:opacity-100"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
