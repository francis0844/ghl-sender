"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Initialises Capacitor plugins and registers the deep-link listener for the
 * OAuth callback. All platform-specific imports are dynamic so this component
 * is completely inert when running in a plain browser.
 */
export default function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import("@capacitor/splash-screen");
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { App } = await import("@capacitor/app");

        await SplashScreen.hide({ fadeOutDuration: 300 });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#f8fafc" });

        // Handle OAuth deep-link: com.andyjorgensen.ghlsender://callback?...
        App.addListener("appUrlOpen", ({ url }) => {
          if (!url.startsWith("com.andyjorgensen.ghlsender://callback")) return;
          const queryString = url.split("?")[1] ?? "";
          const params = new URLSearchParams(queryString);
          const status = params.get("status");
          const error = params.get("error");
          if (status === "connected") {
            router.push("/connections?connected=true");
          } else if (error) {
            router.push(`/connections?error=${encodeURIComponent(error)}`);
          } else {
            router.push("/connections");
          }
        });
      } catch {
        // Not running in Capacitor — ignore
      }
    })();
  }, [router]);

  return null;
}
