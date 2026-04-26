import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.andyjorgensen.ghlsender",
  appName: "GHL Sender",
  webDir: "out",

  server: {
    allowNavigation: ["ghl-sender.vercel.app"],
  },

  // Deep-link URL scheme for OAuth callback (native only).
  // Register this in:
  //   iOS:     ios/App/App/Info.plist → CFBundleURLSchemes → ["com.andyjorgensen.ghlsender"]
  //   Android: android/app/src/main/AndroidManifest.xml → intent-filter with
  //            scheme="com.andyjorgensen.ghlsender" host="callback"
  // Also add "com.andyjorgensen.ghlsender://callback" as a second redirect URI
  // in your GHL Marketplace App settings alongside the Vercel redirect URI.

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
      backgroundColor: "#f8fafc",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;
