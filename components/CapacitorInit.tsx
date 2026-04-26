"use client";

import { useEffect } from "react";

/**
 * Hides the native splash screen and configures the status bar once the
 * web layer has painted. Only runs inside the Capacitor native shell —
 * the dynamic imports are no-ops in a plain browser.
 */
export default function CapacitorInit() {
  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import("@capacitor/splash-screen");
        const { StatusBar, Style } = await import("@capacitor/status-bar");

        await SplashScreen.hide({ fadeOutDuration: 300 });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#f8fafc" });
      } catch {
        // Not running in Capacitor — ignore
      }
    })();
  }, []);

  return null;
}
