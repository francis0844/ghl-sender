import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { encrypt } from "@/lib/encryption";

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const GHL_API = "https://services.leadconnectorhq.com";
const MOBILE_SCHEME = "com.andyjorgensen.ghlsender://callback";

function appRedirect(request: NextRequest, path: string, isMobile: boolean): NextResponse {
  if (isMobile) {
    const params = path.includes("?") ? path.split("?")[1] : "status=connected";
    return NextResponse.redirect(`${MOBILE_SCHEME}?${params}`);
  }
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const isMobile = searchParams.get("source") === "mobile";

  const stateCookie = request.cookies.get("ghl_oauth_state")?.value;

  if (!code || !stateParam || !stateCookie) {
    return appRedirect(request, "/connections?error=invalid_request", isMobile);
  }

  let stateData: { state: string; label: string };
  try {
    stateData = JSON.parse(stateCookie);
  } catch {
    return appRedirect(request, "/connections?error=invalid_state", isMobile);
  }

  if (stateParam !== stateData.state) {
    return appRedirect(request, "/connections?error=state_mismatch", isMobile);
  }

  const tokenRes = await fetch(GHL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.GHL_REDIRECT_URI!,
      client_id: process.env.GHL_CLIENT_ID!,
      client_secret: process.env.GHL_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return appRedirect(request, "/connections?error=token_exchange_failed", isMobile);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, locationId, companyId, userId } =
    tokenData;

  if (!access_token || !refresh_token || !locationId) {
    return appRedirect(request, "/connections?error=incomplete_token", isMobile);
  }

  let accountLabel = stateData.label;
  if (!accountLabel) {
    try {
      const locRes = await fetch(`${GHL_API}/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${access_token}`, Version: "2021-07-28" },
        cache: "no-store",
      });
      if (locRes.ok) {
        const locData = await locRes.json();
        accountLabel = locData.location?.name ?? locData.name ?? locationId;
      }
    } catch {}
  }
  if (!accountLabel) accountLabel = locationId;

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
  const db = getSupabase();

  const { data: existing } = await db
    .from("ghl_connections")
    .select("id")
    .eq("location_id", locationId)
    .maybeSingle();

  const { count } = await db
    .from("ghl_connections")
    .select("*", { count: "exact", head: true });
  const isFirst = (count ?? 0) === 0 && !existing;

  const row = {
    account_label: accountLabel,
    location_id: locationId,
    company_id: companyId ?? null,
    user_id_ghl: userId ?? null,
    access_token_enc: encrypt(access_token),
    refresh_token_enc: encrypt(refresh_token),
    token_expires_at: expiresAt,
    is_active: isFirst,
  };

  if (existing) {
    await db.from("ghl_connections").update(row).eq("id", existing.id);
  } else {
    await db.from("ghl_connections").insert(row);
  }

  const res = appRedirect(request, "/connections?connected=true", isMobile);
  res.cookies.delete("ghl_oauth_state");
  return res;
}
