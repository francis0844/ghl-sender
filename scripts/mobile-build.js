#!/usr/bin/env node
/**
 * Mobile build script for Capacitor static export.
 *
 * API routes cannot be statically exported (they need a Node.js server).
 * This script temporarily moves app/api out of the Next.js app directory so
 * the static export ignores them, then restores the directory afterwards.
 * The mobile app calls the live Vercel API via NEXT_PUBLIC_API_BASE_URL.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const apiDirBak = path.join(root, "app", "_api_mobile_bak");

function restore() {
  if (fs.existsSync(apiDirBak)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true });
    fs.renameSync(apiDirBak, apiDir);
  }
}

try {
  // Hide API routes from Next.js static export
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiDirBak);
  }

  execSync(
    "NEXT_PUBLIC_API_BASE_URL=https://ghl-sender.vercel.app MOBILE_BUILD=true npx next build",
    { stdio: "inherit", cwd: root }
  );

  restore();

  execSync("npx cap sync", { stdio: "inherit", cwd: root });
} catch {
  restore();
  process.exit(1);
}
