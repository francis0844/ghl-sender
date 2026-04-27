"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddConnectionSheet({ isOpen, onClose }: Props) {
  const [label, setLabel] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    const params = label.trim()
      ? `?label=${encodeURIComponent(label.trim())}`
      : "";
    window.location.href = `/api/auth/ghl/connect${params}`;
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add GoHighLevel Account">
      <div className="px-5 pb-2 flex flex-col gap-4">
        <div>
          <label
            htmlFor="conn-label"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            Label this account
          </label>
          <Input
            id="conn-label"
            placeholder="e.g. Fire Bros Fireworks, AiEdge"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isConnecting && handleConnect()}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Optional — if left blank we&apos;ll use your GHL location name.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background text-base font-semibold min-h-[56px] active:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {isConnecting ? "Connecting…" : "Connect GoHighLevel Account"}
        </button>
      </div>
    </BottomSheet>
  );
}
