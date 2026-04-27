"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComposeTarget } from "@/app/page";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type MessageType = "SMS" | "Email" | "WhatsApp";
type Stage = "compose" | "confirm" | "progress" | "done";

interface Props {
  isOpen: boolean;
  target: ComposeTarget;
  onClose: () => void;
}

const CHANNEL_LABELS: Record<MessageType, string> = {
  SMS: "SMS",
  Email: "Email",
  WhatsApp: "WhatsApp",
};

function recipientLabel(target: ComposeTarget): string {
  if (target.type === "smart-list") return target.smartListName;
  if (target.contacts.length === 1) return target.contacts[0].name;
  return `${target.contacts.length} contacts`;
}

function recipientCount(target: ComposeTarget): number {
  return target.contacts.length;
}

export default function ComposeSheet({ isOpen, target, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("compose");
  const [messageType, setMessageType] = useState<MessageType>("SMS");
  const [message, setMessage] = useState("");
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStage("compose");
      setMessage("");
      setSentCount(0);
      setFailedCount(0);
      setTotalCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setStage("progress");
    setTotalCount(recipientCount(target));
    setSentCount(0);
    setFailedCount(0);

    const isSingle = target.type === "contacts" && target.contacts.length === 1;

    if (isSingle) {
      const contact = target.contacts[0];
      try {
        const res = await fetch(`${API_BASE}/api/messages/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contact.contactId,
            type: messageType,
            message: message.trim(),
          }),
        });
        if (res.ok) setSentCount(1);
        else setFailedCount(1);
      } catch {
        setFailedCount(1);
      }
      setStage("done");
      return;
    }

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType,
          message: message.trim(),
          contacts: target.contacts,
          ...(target.type === "smart-list" && {
            smartListId: target.smartListId,
            smartListName: target.smartListName,
          }),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setFailedCount(recipientCount(target));
        setStage("done");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              sentCount: number;
              failedCount: number;
              total: number;
              done?: boolean;
            };
            setSentCount(event.sentCount);
            setFailedCount(event.failedCount);
            setTotalCount(event.total);
            if (event.done) setStage("done");
          } catch {}
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setFailedCount(recipientCount(target));
        setStage("done");
      }
    }
  };

  const handleClose = () => {
    if (stage === "progress") {
      abortRef.current?.abort();
    }
    onClose();
  };

  if (!isOpen) return null;

  const count = recipientCount(target);

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/50"
        style={{ animation: "overlay-in 0.2s ease-out" }}
        onClick={stage !== "progress" ? handleClose : undefined}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full bg-card rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          animation: "sheet-up 0.28s ease-out",
          maxHeight: "92dvh",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="text-base font-semibold text-foreground">
            {stage === "done" ? "Complete" : "Compose Message"}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={stage === "progress"}
            aria-label="Close"
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {(stage === "compose" || stage === "confirm") && (
            <div className="px-5 pb-4 flex flex-col gap-4">
              <div className="rounded-2xl bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                  To
                </p>
                <p className="text-sm font-medium text-foreground">{recipientLabel(target)}</p>
                {count > 1 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {count.toLocaleString()} recipients
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Channel
                </p>
                <div className="flex gap-2">
                  {(["SMS", "Email", "WhatsApp"] as MessageType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMessageType(type)}
                      disabled={stage === "confirm"}
                      className={cn(
                        "flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors",
                        messageType === type
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {CHANNEL_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Message
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  readOnly={stage === "confirm"}
                  placeholder="Type your message…"
                  rows={5}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {message.length} chars
                </p>
              </div>

              {stage === "compose" && (
                <button
                  type="button"
                  disabled={!message.trim()}
                  onClick={() => (count > 1 ? setStage("confirm") : handleSend())}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background text-base font-semibold min-h-[52px] active:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  <Send size={16} />
                  {count > 1 ? `Review — ${count} recipients` : "Send"}
                </button>
              )}

              {stage === "confirm" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStage("compose")}
                    className="flex-1 rounded-2xl border border-border text-foreground text-base font-semibold min-h-[52px] active:opacity-80 transition-opacity"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background text-base font-semibold min-h-[52px] active:opacity-80 transition-opacity"
                  >
                    <Send size={16} />
                    Send {count.toLocaleString()}
                  </button>
                </div>
              )}
            </div>
          )}

          {(stage === "progress" || stage === "done") && (
            <div className="px-5 pb-6 flex flex-col gap-5">
              {stage === "done" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  {failedCount === totalCount ? (
                    <AlertCircle size={40} className="text-destructive" />
                  ) : (
                    <CheckCircle size={40} className="text-green-500" />
                  )}
                  <p className="text-lg font-semibold text-foreground">
                    {failedCount === totalCount ? "All failed" : "Sent!"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-10 w-10 rounded-full border-4 border-muted border-t-foreground animate-spin" />
                  <p className="text-sm font-medium text-foreground">Sending…</p>
                </div>
              )}

              <div className="rounded-2xl bg-muted/50 px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{totalCount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      width: totalCount > 0 ? `${(sentCount / totalCount) * 100}%` : "0%",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 font-medium">
                    ✓ {sentCount.toLocaleString()} sent
                  </span>
                  {failedCount > 0 && (
                    <span className="text-destructive font-medium">
                      ✗ {failedCount.toLocaleString()} failed
                    </span>
                  )}
                </div>
              </div>

              {stage === "done" && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-2xl bg-foreground text-background text-base font-semibold min-h-[52px] active:opacity-80 transition-opacity"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
