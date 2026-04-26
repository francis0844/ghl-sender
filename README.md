# GHL Sender

A mobile-first web app (and Capacitor iOS/Android wrapper) that lets you search for a GoHighLevel contact and send them an SMS, Email, or WhatsApp message without logging into GHL.

---

## Features

- **Contact search** — debounced live search against the GHL contacts API  
- **Channel selector** — SMS, Email, or WhatsApp  
- **Live message preview** — iMessage-style chat bubble  
- **SMS character counter** — warning at 140, hard limit at 160  
- **Recent Sends log** — last 10 sent messages stored in `localStorage`, one-tap Resend  
- **Password protection** — optional `APP_PASSWORD` env var gates the app behind a login screen  
- **Capacitor-ready** — `npm run build:mobile` produces a static export for iOS/Android wrapping  

---

## Prerequisites

- **Node.js 18+** (Node 20 LTS recommended)  
- A **GoHighLevel account** with API access  

---

## Getting your GHL credentials

### API Key

1. Log in to GoHighLevel.  
2. Go to **Settings → Integrations → API Keys**.  
3. Click **Create Key**, give it a name, and copy the key.  
4. Paste it as `GHL_API_KEY` in `.env.local`.

### Location ID

1. In GHL, go to **Settings → Business Profile** (or any settings page).  
2. The URL contains your Location ID, e.g.:  
   `https://app.gohighlevel.com/location/abc123XYZ/settings/…`  
   The `abc123XYZ` segment is your Location ID.  
3. Alternatively, open browser dev tools on any GHL page and run  
   `JSON.parse(localStorage.getItem('locationId'))` in the console.  
4. Paste it as `GHL_LOCATION_ID` in `.env.local`.

---

## Local development

```bash
# 1. Clone and install
git clone https://github.com/francis0844/ghl-sender.git
cd ghl-sender
npm install

# 2. Configure environment variables
#    .env.local already exists — fill in the values:
#      GHL_API_KEY=<your key>
#      GHL_LOCATION_ID=<your location id>
#      APP_PASSWORD=          # optional — leave blank to skip auth locally

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

> **Tip:** Leave `APP_PASSWORD` empty during local development so you skip the login screen on every refresh.

---

## Deploy to Vercel

1. Push the repo to GitHub (already done).  
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.  
3. Under **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `GHL_API_KEY` | your GHL API key |
   | `GHL_LOCATION_ID` | your GHL location ID |
   | `APP_PASSWORD` | a strong password (required for production) |

4. Click **Deploy**. Vercel detects Next.js automatically.

> The API routes (`/api/contacts/search`, `/api/messages/send`, `/api/auth`) run as Vercel Serverless Functions.

---

## Capacitor (iOS / Android)

The mobile app is a native shell (Capacitor) wrapping a static Next.js export. All API calls go to the deployed Vercel backend (`https://ghl-sender.vercel.app`) — the GHL API key never touches the device.

### Prerequisites

| Platform | Requirement |
|----------|-------------|
| iOS | Mac + Xcode 15+ + **paid Apple Developer account ($99/yr)** |
| Android | Android Studio (free) — APK can be shared directly without the Play Store |

### Build and run

```bash
# 1. Build the static export and sync into native projects (one command)
npm run build:mobile
# This runs: NEXT_PUBLIC_API_BASE_URL=https://ghl-sender.vercel.app \
#            MOBILE_BUILD=true next build && npx cap sync
# Output goes to /out, then copied into ios/ and android/

# 2. Open in the native IDE
npm run open:ios      # opens Xcode
npm run open:android  # opens Android Studio

# 3. In Xcode / Android Studio, press Run (▶) to launch on simulator or device
```

### iOS — Release build for TestFlight

1. In Xcode, select your **Team** under *Signing & Capabilities*.
2. Set the scheme to **Release**.
3. **Product → Archive**, then upload to App Store Connect.
4. In App Store Connect, submit the build to **TestFlight** for internal/external testing.
5. Testers install via the TestFlight app — no App Store listing required.

> Requires an active **Apple Developer Program** membership ($99/yr).

### Android — Release APK (direct install)

```bash
# In Android Studio: Build → Generate Signed Bundle / APK → APK
# Or from the command line:
cd android && ./gradlew assembleRelease
# Signed APK: android/app/build/outputs/apk/release/app-release.apk
```

Share the APK file directly — recipients enable **Install from unknown sources** in Settings and install it without the Play Store.

### App icon

A placeholder SVG icon is at `public/app-icon.svg` (1024×1024, dark navy background with "G"). Replace it with your own artwork and run the following to regenerate all native icon sizes:

```bash
# After replacing public/app-icon.svg with your 1024×1024 image:
npx @capacitor/assets generate --iconBackgroundColor '#0f172a' --splashBackgroundColor '#f8fafc'
```

### How API security works on mobile

```
Native app (device)
  └─ WebView loads static HTML/JS from /out
       └─ fetch("https://ghl-sender.vercel.app/api/contacts/search")
            └─ Vercel serverless function (has GHL_API_KEY in env)
                 └─ GHL API
```

The `GHL_API_KEY` lives only in Vercel's environment — it is never bundled into the app binary.

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GHL_API_KEY` | Yes (server) | GoHighLevel API key |
| `GHL_LOCATION_ID` | Yes (server) | GHL location / sub-account ID |
| `APP_PASSWORD` | No | Password for the `/login` screen. Unset = no auth. |
| `NEXT_PUBLIC_API_BASE_URL` | Capacitor only | Base URL of the deployed API server used by the native app |

---

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (server — API routes enabled) |
| `npm run build:mobile` | Static export + `cap sync` (points at Vercel API) |
| `npm run open:ios` | Open Xcode with the iOS project |
| `npm run open:android` | Open Android Studio with the Android project |
| `npm start` | Start production server (after `npm run build`) |
| `npm run lint` | Run ESLint |
