"use client";

import { useEffect } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children, footer }: BottomSheetProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ animation: "overlay-in 0.2s ease-out" }}
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full bg-card rounded-t-3xl shadow-2xl max-h-[85dvh] flex flex-col"
        style={{
          animation: "sheet-up 0.28s ease-out",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {title && (
          <div className="px-5 pb-3 shrink-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
        )}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer}
      </div>
    </div>
  );
}
