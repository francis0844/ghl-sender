"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, History } from "lucide-react";
import AccountSwitcher from "@/components/AccountSwitcher";
import ContactsTab from "@/components/ContactsTab";
import SmartListsTab from "@/components/SmartListsTab";
import ComposeSheet from "@/components/ComposeSheet";
import type { Contact } from "@/types/contact";
import type { GHLConnection } from "@/types/ghl-connection";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type Tab = "contacts" | "smart-lists";

export type ComposeTarget =
  | { type: "contacts"; contacts: Contact[] }
  | { type: "smart-list"; smartListId: string; smartListName: string; contacts: Contact[] };

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("contacts");
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/connections`)
      .then((r) => r.json())
      .then((d) => {
        const connections: GHLConnection[] = d.connections ?? [];
        if (connections.length === 0) router.replace("/connections");
        const active = connections.find((c) => c.is_active);
        if (active) setActiveConnectionId(active.id);
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="flex flex-col h-full">
      <header
        className="sticky top-0 z-10 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">GHL Sender</h1>
          <div className="flex items-center gap-0.5">
            <AccountSwitcher onSwitch={(conn: GHLConnection) => setActiveConnectionId(conn.id)} />
            <Link
              href="/history"
              aria-label="Send history"
              className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
            >
              <History size={18} aria-hidden />
            </Link>
            <Link
              href="/connections"
              aria-label="Manage accounts"
              className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
            >
              <Settings size={18} aria-hidden />
            </Link>
          </div>
        </div>

        <div className="flex px-4 gap-1 pb-0">
          {(["contacts", "smart-lists"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "contacts" ? "Contacts" : "Smart Lists"}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === "contacts" && (
          <ContactsTab onCompose={(target) => setComposeTarget(target)} />
        )}
        {activeTab === "smart-lists" && (
          <SmartListsTab onCompose={(target) => setComposeTarget(target)} connectionId={activeConnectionId} />
        )}
      </main>

      {composeTarget && (
        <ComposeSheet
          isOpen={!!composeTarget}
          target={composeTarget}
          onClose={() => setComposeTarget(null)}
        />
      )}
    </div>
  );
}
