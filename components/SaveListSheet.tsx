"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { BookmarkCheck } from "lucide-react";
import type { Contact } from "@/types/contact";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface Props {
  isOpen: boolean;
  contacts: Contact[];
  onClose: () => void;
  onSaved: () => void;
}

export default function SaveListSheet({ isOpen, contacts, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/smart-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contacts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to save list");
        return;
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setName("");
        onSaved();
      }, 800);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setName("");
    setError(null);
    setSaved(false);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Save as Smart List">
      <div className="px-5 pb-2 flex flex-col gap-4">
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            Contacts
          </p>
          <p className="text-sm font-medium text-foreground">
            {contacts.length.toLocaleString()} contact{contacts.length !== 1 ? "s" : ""} will be saved
          </p>
        </div>

        <div>
          <label
            htmlFor="list-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            List name
          </label>
          <Input
            id="list-name"
            placeholder="e.g. Hot Leads, Follow-up Q2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
            autoComplete="off"
          />
          {error && (
            <p className="mt-1.5 text-xs text-destructive">{error}</p>
          )}
        </div>

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
            "Save List"
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
