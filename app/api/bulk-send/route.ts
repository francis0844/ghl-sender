import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";
import type { Contact } from "@/types/contact";

const GHL_API = "https://services.leadconnectorhq.com";
type MessageType = "SMS" | "Email" | "WhatsApp";

async function sendOne(
  contactId: string,
  messageType: MessageType,
  message: string,
  locationId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(`${GHL_API}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: messageType, contactId, message, locationId }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: {
    messageType: MessageType;
    message: string;
    contacts: Contact[];
    smartListId?: string;
    smartListName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messageType, message, contacts, smartListId, smartListName } = body;

  if (!messageType || !message?.trim() || !contacts?.length) {
    return NextResponse.json(
      { error: "messageType, message, and contacts are required" },
      { status: 400 }
    );
  }

  const VALID: MessageType[] = ["SMS", "Email", "WhatsApp"];
  if (!VALID.includes(messageType)) {
    return NextResponse.json({ error: "Invalid messageType" }, { status: 400 });
  }

  let accessToken: string, locationId: string, connectionId: string, accountLabel: string;
  try {
    ({ accessToken, locationId, connectionId, accountLabel } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const supabase = getSupabase();

  const { data: campaign, error: insertErr } = await supabase
    .from("bulk_send_campaigns")
    .insert({
      connection_id: connectionId,
      account_label: accountLabel,
      message_type: messageType,
      message: message.trim(),
      recipient_count: contacts.length,
      sent_count: 0,
      failed_count: 0,
      status: "running",
      smart_list_id: smartListId ?? null,
      smart_list_name: smartListName ?? null,
      contact_ids: contacts.map((c) => c.contactId),
    })
    .select("id")
    .single();

  if (insertErr || !campaign) {
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }

  const campaignId = campaign.id as string;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      let sentCount = 0;
      let failedCount = 0;

      for (const contact of contacts) {
        const ok = await sendOne(contact.contactId, messageType, message.trim(), locationId, accessToken);
        if (ok) sentCount++;
        else failedCount++;

        await supabase
          .from("bulk_send_campaigns")
          .update({ sent_count: sentCount, failed_count: failedCount })
          .eq("id", campaignId);

        send({ campaignId, sentCount, failedCount, total: contacts.length });
      }

      const finalStatus = failedCount === contacts.length ? "failed" : "completed";
      await supabase
        .from("bulk_send_campaigns")
        .update({ status: finalStatus, completed_at: new Date().toISOString() })
        .eq("id", campaignId);

      await supabase
        .from("ghl_connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", connectionId);

      send({ campaignId, sentCount, failedCount, total: contacts.length, done: true });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Campaign-Id": campaignId,
    },
  });
}
