import { Suspense } from "react";
import ConnectionsManager from "@/components/ConnectionsManager";
import ConnectionsErrorBoundary from "@/components/ConnectionsErrorBoundary";

// Prevent static prerendering — this page reads searchParams at runtime
// (OAuth callback query params: ?connected=true / ?error=...) and fetches
// live data from Supabase, so it must render dynamically on each request.
export const dynamic = "force-dynamic";

function LoadingSkeleton() {
  return (
    <div className="flex flex-col min-h-full">
      <div
        className="sticky top-0 z-10 px-4 pb-4 border-b border-border bg-card/90"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="h-7 w-24 bg-muted rounded-full animate-pulse" />
      </div>
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-muted rounded-full animate-pulse w-3/5" />
                <div className="h-3 bg-muted rounded-full animate-pulse w-2/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <ConnectionsErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <ConnectionsManager />
      </Suspense>
    </ConnectionsErrorBoundary>
  );
}
