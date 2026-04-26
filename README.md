# GHL Sender

A mobile-first web app (and Capacitor iOS/Android wrapper) that lets you search for a GoHighLevel contact and send them an SMS, Email, or WhatsApp message without logging into GHL. Supports multiple GHL accounts/locations with one-tap switching.

---

## Features

- **Multi-account manager** — connect multiple GHL locations, switch the active one instantly
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
- A **GoHighLevel Marketplace App** (for OAuth)
- A **Supabase project** (free tier works fine)

---

## 1. Create a GHL Marketplace App

1. Go to [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) → **Create App**.
2. Under **Redirect URIs**, add:
   - `https://ghl-sender.vercel.app/api/auth/ghl/callback` (production)
   - `https://YOUR-NGROK-ID.ngrok-free.app/api/auth/ghl/callback` (local dev — see below)
   - `com.andyjorgensen.ghlsender://callback` (native app deep link)
3. Under **Scopes**, enable:
   `contacts.readonly`, `contacts.write`, `conversations.write`, `locations.readonly`
4. Copy **Client ID** and **Client Secret** into `.env.local`.

---

## 2. Create the Supabase table

In your Supabase project → **SQL Editor**, run:

```sql
create table ghl_connections (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamp default now(),
  account_label     text,
  location_id       text not null,
  company_id        text,
  user_id_ghl       text,
  email             text,
  access_token_enc  text not null,
  refresh_token_enc text not null,
  token_expires_at  timestamptz not null,
  is_active         boolean default false,
  last_used_at      timestamptz
);

-- Disable RLS (the app uses its own password-based auth layer)
alter table ghl_connections disable row level security;
```

Copy your **Project URL** and **service_role** key (Settings → API) into `.env.local`.

---

## 3. Local development

```bash
# 1. Clone and install
git clone https://github.com/francis0844/ghl-sender.git
cd ghl-sender
npm install

# 2. Fill in .env.local (see Environment variables reference below)

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

### Testing OAuth locally with ngrok

GHL requires a public HTTPS URL for its redirect URI. Use [ngrok](https://ngrok.com) to expose your local server:

```bash
# Install ngrok, then:
ngrok http 3000
# Note the HTTPS URL, e.g. https://abc123.ngrok-free.app
```

Set `GHL_REDIRECT_URI=https://abc123.ngrok-free.app/api/auth/ghl/callback` in `.env.local`
and add the same URL to your GHL Marketplace App's Redirect URIs.

> **Tip:** Leave `APP_PASSWORD` empty during local dev to skip the login screen on every refresh.

---

## 4. Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Under **Environment Variables**, add all variables from the table below.
4. Click **Deploy**. Vercel detects Next.js automatically.

> The API routes run as Vercel Serverless Functions. The `SUPABASE_SERVICE_ROLE_KEY` and `TOKEN_ENCRYPTION_KEY` never leave the server.

---

## 5. Connecting multiple GHL accounts

1. Open `/connections` in the app (or tap the account name in the header).
2. Tap **Add** → optionally label the account (e.g. "Fire Bros Fireworks") → **Connect GoHighLevel Account**.
3. Complete the GHL OAuth flow — choose the location/sub-account.
4. The account appears in your list. The first connection is automatically set active.
5. To switch: tap **Set Active** on any card, or tap the account name in the header.
6. To add more locations: repeat from step 2.

---

## 6. How active account switching works

- One connection is marked `is_active = true` in the database at any time.
- All contact searches and message sends use the active account's OAuth token automatically.
- Switching via the account switcher calls `POST /api/auth/ghl/set-active` — instant, no page reload.
- Tokens are auto-refreshed server-side when they're within 5 minutes of expiry.
- Access tokens and refresh tokens are AES-256-GCM encrypted at rest in Supabase.

---

## Capacitor (iOS / Android)

See the [Capacitor section](#capacitor-ios--android-1) below for mobile build instructions.

### Deep link setup for native OAuth

After OAuth completes in the in-app browser, GHL redirects to:
- **Web:** `https://ghl-sender.vercel.app/api/auth/ghl/callback`
- **Native:** `com.andyjorgensen.ghlsender://callback`

Register the custom scheme in the native projects:

**iOS** — add to `ios/App/App/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.andyjorgensen.ghlsender</string>
    </array>
  </dict>
</array>
```

**Android** — add inside `<activity>` in `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.andyjorgensen.ghlsender" android:host="callback" />
</intent-filter>
```

---

## Capacitor (iOS / Android)

The mobile app is a native shell wrapping a static Next.js export. All API calls go to the deployed Vercel backend — the GHL credentials never touch the device.

### Prerequisites

| Platform | Requirement |
|----------|-------------|
| iOS | Mac + Xcode 15+ + **paid Apple Developer account ($99/yr)** |
| Android | Android Studio (free) — APK can be shared directly without the Play Store |

### Build and run

```bash
# Build static export and sync into native projects
npm run build:mobile

# Open in the native IDE
npm run open:ios      # opens Xcode
npm run open:android  # opens Android Studio

# Press Run (▶) in Xcode / Android Studio to launch on simulator or device
```

### iOS — Release build for TestFlight

1. In Xcode, select your **Team** under *Signing & Capabilities*.
2. Set scheme to **Release** → **Product → Archive** → upload to App Store Connect.
3. Submit the build to **TestFlight** for internal/external testing.

> Requires an active **Apple Developer Program** membership ($99/yr).

### Android — Release APK (direct install)

```bash
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

Share the APK directly — recipients enable **Install from unknown sources** in Settings.

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_PASSWORD` | No | Password for the `/login` screen. Unset = no auth. |
| `GHL_CLIENT_ID` | Yes | OAuth Client ID from your GHL Marketplace App |
| `GHL_CLIENT_SECRET` | Yes | OAuth Client Secret from your GHL Marketplace App |
| `GHL_REDIRECT_URI` | Yes | Registered redirect URI (must match GHL app settings exactly) |
| `TOKEN_ENCRYPTION_KEY` | Yes | Any random string — used to AES-256-GCM encrypt tokens at rest |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server-side only, never expose to client** |
| `NEXT_PUBLIC_API_BASE_URL` | Capacitor only | Baked in automatically by `npm run build:mobile` |

Generate a `TOKEN_ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
