import { NextRequest, NextResponse } from "next/server";
import {
  getActiveGHLToken,
  getGHLTokenById,
  GHLNotConnectedError,
} from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";

const GHL_API = "https://services.leadconnectorhq.com";
type MessageType = "SMS" | "Email" | "WhatsApp";
const VALID_TYPES: MessageType[] = ["SMS", "Email", "WhatsApp"];

export async function POST(request: NextRequest) {
  let body: {
    contactId: string;
    type: MessageType;
    message: string;
    connectionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contactId, type, message, connectionId: requestedId } = body ?? {};

  if (!contactId || !type || !message?.trim()) {
    return NextResponse.json(
      { error: "contactId, type, and message are required" },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  let accessToken: string, locationId: string, activeConnectionId: string;
  try {
    if (requestedId) {
      ({ accessToken, locationId, connectionId: activeConnectionId } =
        await getGHLTokenById(requestedId));
    } else {
      ({ accessToken, locationId, connectionId: activeConnectionId } =
        await getActiveGHLToken());
    }
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json(
        { error: "not_connected", message: "No active GHL account connected" },
        { status: 401 }
      );
    }
    throw e;
  }

  const res = await fetch(`${GHL_API}/conversations/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, contactId, message: message.trim(), locationId }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { message?: string }).message ?? "Failed to send message" },
      { status: res.status }
    );
  }

  await getSupabase()
    .from("ghl_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", activeConnectionId);

  return NextResponse.json({ success: true, data });
}
