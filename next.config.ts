import type { NextConfig } from "next";

// For Capacitor mobile builds use: MOBILE_BUILD=true npm run build:mobile
// That produces a static export in /out which Capacitor copies to native projects.
// For web / server deployments (API routes enabled), use: npm run build
const isMobileBuild = process.env.MOBILE_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isMobileBuild
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
