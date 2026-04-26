import { supabase } from "./supabase";
import { encrypt, decrypt } from "./encryption";

export class GHLNotConnectedError extends Error {
  constructor() {
    super("No active GHL account connected");
    this.name = "GHLNotConnectedError";
  }
}

export interface TokenResult {
  accessToken: string;
  locationId: string;
  connectionId: string;
  accountLabel: string;
}

/** Refresh a connection's tokens via GHL OAuth and persist the new ones. */
export async function refreshConnectionTokens(connectionId: string): Promise<string> {
  const { data: row } = await supabase
    .from("ghl_connections")
    .select("id, refresh_token_enc")
    .eq("id", connectionId)
    .single();

  if (!row) throw new Error("Connection not found for refresh");

  const refreshToken = decrypt(row.refresh_token_enc);

  const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GHL_CLIENT_ID!,
      client_secret: process.env.GHL_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GHL token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const { access_token, refresh_token: newRefresh, expires_in } = data;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabase
    .from("ghl_connections")
    .update({
      access_token_enc: encrypt(access_token),
      refresh_token_enc: encrypt(newRefresh ?? refreshToken),
      token_expires_at: expiresAt,
    })
    .eq("id", connectionId);

  return access_token;
}

type TokenRow = {
  id: string;
  account_label: string;
  location_id: string;
  access_token_enc: string;
  token_expires_at: string;
};

async function resolveToken(row: TokenRow): Promise<string> {
  const expiresAt = new Date(row.token_expires_at).getTime();
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    return refreshConnectionTokens(row.id);
  }
  return decrypt(row.access_token_enc);
}

const SELECT_COLS =
  "id, account_label, location_id, access_token_enc, token_expires_at";

export async function getActiveGHLToken(): Promise<TokenResult> {
  const { data, error } = await supabase
    .from("ghl_connections")
    .select(SELECT_COLS)
    .eq("is_active", true)
    .single();

  if (error || !data) throw new GHLNotConnectedError();

  const accessToken = await resolveToken(data as TokenRow);
  return {
    accessToken,
    locationId: data.location_id,
    connectionId: data.id,
    accountLabel: data.account_label,
  };
}

export async function getGHLTokenById(connectionId: string): Promise<TokenResult> {
  const { data, error } = await supabase
    .from("ghl_connections")
    .select(SELECT_COLS)
    .eq("id", connectionId)
    .single();

  if (error || !data) throw new GHLNotConnectedError();

  const accessToken = await resolveToken(data as TokenRow);
  return {
    accessToken,
    locationId: data.location_id,
    connectionId: data.id,
    accountLabel: data.account_label,
  };
}
