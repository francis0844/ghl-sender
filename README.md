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

The mobile build uses `output: 'export'` to produce a static site that Capacitor copies into the native project.

```bash
# 1. Build the static export
#    Set the deployed API URL first — the static app must call an external server
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app npm run build:mobile
# Output goes to /out

# 2. Sync into Capacitor
npx cap sync

# 3. Open native IDE
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

> **Note:** Static exports cannot run server-side code.  
> `NEXT_PUBLIC_API_BASE_URL` must point to your deployed Vercel URL so the  
> native app knows where to send API calls.

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
| `npm run build:mobile` | Static export for Capacitor (`MOBILE_BUILD=true`) |
| `npm start` | Start production server (after `npm run build`) |
| `npm run lint` | Run ESLint |
