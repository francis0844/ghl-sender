import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import type { Contact } from "@/types/contact";

type MessageType = "SMS" | "Email" | "WhatsApp";

export async function POST(request: NextRequest) {
  let body: { contacts: Contact[]; messageType: MessageType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contacts, messageType } = body;
  if (!Array.isArray(contacts) || !messageType) {
    return NextResponse.json({ error: "contacts and messageType required" }, { status: 400 });
  }

  try {
    await getActiveGHLToken();
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  let eligible = 0;
  let missing_phone = 0;
  let missing_email = 0;
  let sampleContact: Contact | null = null;

  for (const c of contacts) {
    const ok = messageType === "Email" ? !!c.email : !!c.phone;
    if (ok) {
      eligible++;
      if (!sampleContact) sampleContact = c;
    } else if (messageType === "Email") {
      missing_email++;
    } else {
      missing_phone++;
    }
  }

  return NextResponse.json({
    total: contacts.length,
    eligible,
    skipped: missing_phone + missing_email,
    skippedReasons: { missing_phone, missing_email },
    sampleContact,
  });
}
