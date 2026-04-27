"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BulkSendCampaign, CampaignStatus } from "@/types/campaign";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PAGE_SIZE = 20;

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

function statusIcon(status: CampaignStatus) {
  if (status === "completed") return <CheckCircle size={16} className="text-green-500 shrink-0" />;
  if (status === "failed") return <AlertCircle size={16} className="text-destructive shrink-0" />;
  if (status === "running") return <Loader2 size={16} className="text-primary animate-spin shrink-0" />;
  return <Clock size={16} className="text-muted-foreground shrink-0" />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<{ campaigns: BulkSendCampaign[]; total: number }>(
    `/api/bulk-send/history?page=${page}&limit=${PAGE_SIZE}`,
    fetcher
  );

  const campaigns = data?.campaigns ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="sticky top-0 z-10 shrink-0 px-4 pb-4 border-b border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back"
            className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors -ml-1"
          >
            <ArrowLeft size={20} aria-hidden />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Send History</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="h-3.5 bg-muted rounded-full animate-pulse w-2/5" />
                <div className="h-3 bg-muted rounded-full animate-pulse w-3/5" />
                <div className="h-3 bg-muted rounded-full animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Clock size={32} className="opacity-30" />
            <p className="text-sm">No send history yet.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2">
                    {statusIcon(c.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {c.smart_list_name ?? `${c.recipient_count} contacts`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.account_label} · {c.message_type}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                        c.status === "completed" && "bg-green-500/10 text-green-600",
                        c.status === "failed" && "bg-destructive/10 text-destructive",
                        c.status === "running" && "bg-primary/10 text-primary",
                        c.status === "pending" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-sm text-foreground/80 line-clamp-2 italic">
                    &ldquo;{c.message}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      {c.sent_count}/{c.recipient_count} sent
                      {c.failed_count > 0 && ` · ${c.failed_count} failed`}
                    </span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-sm font-medium text-foreground disabled:opacity-40 px-4 py-2 rounded-full border border-border active:bg-muted"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-sm font-medium text-foreground disabled:opacity-40 px-4 py-2 rounded-full border border-border active:bg-muted"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
