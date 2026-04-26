"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ConnectionsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex flex-col min-h-full items-center justify-center px-6 text-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 40px)" }}
      >
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-4 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={28} aria-hidden className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground leading-snug">
              Could not load your connections. Please refresh and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-[48px] rounded-xl bg-foreground text-background text-sm font-semibold active:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
