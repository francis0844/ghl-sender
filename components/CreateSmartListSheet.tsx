"use client";

import { useState } from "react";
import { BookmarkCheck, Filter, Users } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import type { Contact } from "@/types/contact";
import type { ContactFilter } from "@/types/filter";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export interface ManualCreateMode {
  mode: "manual";
  contacts: Contact[];
}

export interface DynamicCreateMode {
  mode: "dynamic";
  filterRules: ContactFilter;
  searchQuery?: string;
  estimatedCount: number;
}

export type CreateMode = ManualCreateMode | DynamicCreateMode;

interface Props {
  isOpen: boolean;
  createMode: CreateMode | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateSmartListSheet({ isOpen, createMode, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (saving) return;
    setName("");
    setDescription("");
    setError(null);
    setSaved(false);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim() || saving || !createMode) return;
    setSaving(true);
    setError(null);

    try {
      const body =
        createMode.mode === "manual"
          ? {
              name: name.trim(),
              description: description.trim() || undefined,
              sourceType: "local_manual",
              contacts: createMode.contacts,
            }
          : {
              name: name.trim(),
              description: description.trim() || undefined,
              sourceType: "local_dynamic",
              filterRules: createMode.filterRules,
              searchQuery: createMode.searchQuery || undefined,
            };

      const res = await fetch(`${API_BASE}/api/smart-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setName("");
        setDescription("");
        onCreated();
      }, 700);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  if (!createMode) return null;

  const isDynamic = createMode.mode === "dynamic";
  const count = isDynamic ? createMode.estimatedCount : createMode.contacts.length;

  const footer = (
    <div className="px-5 pt-3 pb-4 border-t border-border">
      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim() || saving || saved}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background text-base font-semibold min-h-[52px] active:opacity-80 disabled:opacity-40 transition-opacity"
      >
        {saved ? (
          <>
            <BookmarkCheck size={16} />
            Saved!
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save Smart List"
        )}
      </button>
    </div>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Create Smart List" footer={footer}>
      <div className="px-5 pb-4 flex flex-col gap-4">
        {/* Mode card */}
        <div className="rounded-2xl bg-muted/50 px-4 py-3 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            {isDynamic ? (
              <Filter size={14} className="text-muted-foreground" />
            ) : (
              <Users size={14} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {isDynamic ? "Dynamic List" : "Manual List"}
            </p>
            <p className="text-sm text-foreground leading-snug">
              {isDynamic
                ? `~${count.toLocaleString()} contacts match the current filters. Contacts resolve dynamically on each send.`
                : `${count.toLocaleString()} contact${count !== 1 ? "s" : ""} will be saved as a snapshot.`}
            </p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="sl-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            List name
          </label>
          <Input
            id="sl-name"
            placeholder="e.g. Hot Leads, VIP Contacts"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
            autoComplete="off"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="sl-desc"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            Description{" "}
            <span className="normal-case font-normal">(optional)</span>
          </label>
          <Input
            id="sl-desc"
            placeholder="Short description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </BottomSheet>
  );
}
