import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.andyjorgensen.ghlsender",
  appName: "GHL Sender",
  webDir: "out",

  server: {
    // Allow the native WebView to navigate to the production API so that
    // fetch() calls to NEXT_PUBLIC_API_BASE_URL are not blocked by the OS.
    allowNavigation: ["ghl-sender.vercel.app"],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#f8fafc",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      // Match the app's --foreground token (#0f172a = dark navy)
      backgroundColor: "#f8fafc",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;
