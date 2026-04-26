"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/contact";
import type { Channel, SendRecord } from "@/types/message";

const CHANNELS: Channel[] = ["SMS", "Email", "WhatsApp"];
const SMS_LIMIT = 160;
const SMS_WARN = 140;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface ToastState {
  type: "success" | "error";
  text: string;
}

interface Props {
  contact: Contact;
  /** Pre-fill the channel (used by Resend). */
  defaultChannel?: Channel;
  /** Pre-fill the message body (used by Resend). */
  defaultMessage?: string;
  /** Increment to trigger a re-fill without remounting the component. */
  fillKey?: number;
  /** Called after a successful send so the parent can record it. */
  onSent?: (record: SendRecord) => void;
}

export default function ComposeMessage({
  contact,
  defaultChannel,
  defaultMessage,
  fillKey = 0,
  onSent,
}: Props) {
  const [channel, setChannel] = useState<Channel>(defaultChannel ?? "SMS");
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unmounted = useRef(false);
  useEffect(() => () => { unmounted.current = true; }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Re-fill when the parent signals a Resend (fillKey increments)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (fillKey > 0) {
      setChannel(defaultChannel ?? "SMS");
      setMessage(defaultMessage ?? "");
    }
  }, [fillKey]);

  const charCount = message.length;
  const isSmsOverLimit = channel === "SMS" && charCount > SMS_LIMIT;
  const isSmsNearLimit = channel === "SMS" && charCount >= SMS_WARN && !isSmsOverLimit;

  const missingContactInfo =
    (channel === "Email" && !contact.email) ||
    ((channel === "SMS" || channel === "WhatsApp") && !contact.phone);

  const canSend =
    !!message.trim() && !isSmsOverLimit && !isSending && !missingContactInfo;

  // Scroll preview into view when the user first starts typing
  useEffect(() => {
    if (message.length === 1 && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [message]);

  const showToast = (type: "success" | "error", text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => {
      if (!unmounted.current) setToast(null);
    }, 4000);
  };

  const handleSend = async () => {
    if (!canSend) return;
    const body = message.trim();
    const sentChannel = channel;
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.contactId,
          type: sentChannel,
          message: body,
        }),
      });
      const data: { error?: string } = await res.json();
      if (unmounted.current) return;

      if (!res.ok) {
        showToast("error", data.error ?? "Failed to send message");
      } else {
        showToast("success", `Message sent to ${contact.name}`);
        setMessage("");
        onSent?.({
          id: crypto.randomUUID(),
          contact,
          channel: sentChannel,
          message: body,
          sentAt: new Date().toISOString(),
        });
      }
    } catch {
      if (!unmounted.current) {
        showToast("error", "Network error — please try again");
      }
    } finally {
      if (!unmounted.current) setIsSending(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Divider separating the contact card from the compose area */}
        <div className="border-t border-border" />

        {/* ── Channel selector ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Channel
          </p>
          <div
            role="group"
            aria-label="Message channel"
            className="flex rounded-xl border border-border overflow-hidden bg-muted p-1 gap-1"
          >
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                role="radio"
                aria-checked={channel === ch}
                onClick={() => setChannel(ch)}
                className={cn(
                  "flex-1 py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors",
                  channel === ch
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground active:bg-card/60"
                )}
              >
                {ch}
              </button>
            ))}
          </div>

          {missingContactInfo && (
            <p className="mt-1.5 text-xs text-amber-600" role="alert">
              {channel === "Email"
                ? "No email address on file for this contact."
                : "No phone number on file for this contact."}
            </p>
          )}
        </div>

        {/* ── Textarea + character counter ── */}
        <div className="relative">
          <Textarea
            rows={5}
            placeholder={
              channel === "SMS"
                ? "Write your SMS message…"
                : channel === "Email"
                  ? "Write your email…"
                  : "Write your WhatsApp message…"
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Message body"
            style={{ fontSize: "16px" }}
            className={cn(
              "min-h-[120px]",
              channel === "SMS" && "pb-8",
              isSmsOverLimit && "border-red-400 focus-visible:ring-red-400"
            )}
          />
          {channel === "SMS" && (
            <span
              aria-live="polite"
              className={cn(
                "absolute bottom-2.5 right-3 text-xs tabular-nums pointer-events-none",
                isSmsOverLimit
                  ? "text-red-500 font-semibold"
                  : isSmsNearLimit
                    ? "text-amber-500 font-medium"
                    : "text-muted-foreground"
              )}
            >
              {charCount}/{SMS_LIMIT}
            </span>
          )}
        </div>

        {/* ── Real-time preview ── */}
        <div ref={previewRef}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Preview
          </p>
          <Card
            className={cn(
              "transition-opacity duration-200",
              message.trim() ? "opacity-100" : "opacity-60"
            )}
          >
            <CardContent className="pt-4 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
                    To
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {contact.name}
                  </p>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                  {channel}
                </span>
              </div>

              {/* iMessage-style gray bubble — incoming / left-aligned */}
              <div className="flex items-end gap-2.5">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div
                  className="max-w-[82%] px-4 py-2.5"
                  style={{
                    backgroundColor: "#e9e9eb",
                    borderRadius: "18px 18px 18px 4px",
                  }}
                >
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[20px]"
                    style={{ color: "#1c1c1e" }}
                  >
                    {message.trim() || (
                      <span style={{ color: "#8e8e93", fontStyle: "italic" }}>
                        Your message will appear here…
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Send button — sticky above keyboard on mobile ── */}
        <div
          className="sticky bottom-0 z-20 -mx-4 px-4 pt-3 bg-background border-t border-border"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-disabled={!canSend}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 rounded-2xl",
              "text-base font-semibold transition-colors min-h-[56px]",
              canSend
                ? "bg-foreground text-background active:opacity-80"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSending ? (
              <>
                <Loader2 size={18} aria-hidden className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send size={18} aria-hidden />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Toast — fixed above the sticky button ── */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "fixed left-4 right-4 z-50 flex items-start justify-between gap-3",
            "px-4 py-3.5 rounded-2xl shadow-xl text-sm font-medium",
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          )}
          style={{
            bottom: "calc(max(env(safe-area-inset-bottom, 0px), 0px) + 88px)",
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
    </>
  );
}
