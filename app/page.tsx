"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/contact";
import type { SendRecord, Channel } from "@/types/message";
import ContactSearch from "@/components/ContactSearch";
import ComposeMessage from "@/components/ComposeMessage";
import RecentSends from "@/components/RecentSends";
import AccountSwitcher from "@/components/AccountSwitcher";

const RECENT_KEY = "ghl_recent_sends";

export default function Home() {
  const router = useRouter();
  const [selected, setSelected] = useState<Contact | null>(null);
  const [recentSends, setRecentSends] = useState<SendRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as SendRecord[]) : [];
    } catch {
      return [];
    }
  });
  const [composeDefaults, setComposeDefaults] = useState<{
    channel: Channel;
    message: string;
  } | null>(null);
  const [fillKey, setFillKey] = useState(0);

  // Redirect to /connections if there are no connected accounts
  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => {
        if ((d.connections ?? []).length === 0) router.replace("/connections");
      })
      .catch(() => {});
  }, [router]);

  const handleSent = (record: SendRecord) => {
    setRecentSends((prev) => {
      const next = [record, ...prev].slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResend = (record: SendRecord) => {
    setSelected(record.contact);
    setComposeDefaults({ channel: record.channel, message: record.message });
    setFillKey((k) => k + 1);
    // Let React finish rendering the compose area before scrolling
    setTimeout(
      () =>
        document
          .getElementById("compose-area")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header — handles safe-area-inset-top so its background fills the status bar */}
      <header
        className="sticky top-0 z-10 px-4 pb-4 border-b border-border bg-card/90 backdrop-blur-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            GHL Sender
          </h1>
          <AccountSwitcher />
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <ContactSearch selected={selected} onSelect={setSelected} />

        {/* Compose section — rendered by page so state can be reset on Resend */}
        {selected && (
          <div id="compose-area" className="mt-4">
            <ComposeMessage
              key={fillKey}
              contact={selected}
              defaultChannel={composeDefaults?.channel}
              defaultMessage={composeDefaults?.message}
              onSent={handleSent}
            />
          </div>
        )}

        <RecentSends records={recentSends} onResend={handleResend} />

        <footer className="mt-10 pb-28 text-center">
          <p className="text-xs text-muted-foreground/50 select-none">
            Powered by GHL API
          </p>
        </footer>
      </main>
    </div>
  );
}
