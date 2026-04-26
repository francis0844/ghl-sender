"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SendRecord } from "@/types/message";

function relativeTime(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function truncate(str: string, max = 60): string {
  return str.length > max ? str.slice(0, max).trimEnd() + "…" : str;
}

const CHANNEL_PILL: Record<string, string> = {
  SMS: "bg-blue-50 text-blue-700",
  Email: "bg-violet-50 text-violet-700",
  WhatsApp: "bg-green-50 text-green-700",
};

interface Props {
  records: SendRecord[];
  onResend: (record: SendRecord) => void;
}

export default function RecentSends({ records, onResend }: Props) {
  if (records.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Recent Sends
      </h2>

      <div className="flex flex-col gap-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              {/* Name + channel pill */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {record.contact.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                    CHANNEL_PILL[record.channel] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {record.channel}
                </span>
              </div>

              {/* Message preview */}
              <p className="text-xs text-muted-foreground leading-snug">
                {truncate(record.message)}
              </p>

              {/* Timestamp */}
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                {relativeTime(record.sentAt)}
              </p>
            </div>

            {/* Resend button — 44×44 tap target */}
            <button
              type="button"
              onClick={() => onResend(record)}
              aria-label={`Resend to ${record.contact.name}`}
              className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-muted text-muted-foreground active:bg-border transition-colors"
            >
              <RotateCcw size={15} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
