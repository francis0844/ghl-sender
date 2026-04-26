import { Suspense } from "react";
import ConnectionsManager from "@/components/ConnectionsManager";

// Prevent static prerendering — this page reads searchParams at runtime
// (OAuth callback query params: ?connected=true / ?error=...) and fetches
// live data from Supabase, so it must render dynamically on each request.
export const dynamic = "force-dynamic";

export default function ConnectionsPage() {
  return (
    <Suspense>
      <ConnectionsManager />
    </Suspense>
  );
}
