import { NextRequest, NextResponse } from "next/server";

type MessageType = "SMS" | "Email" | "WhatsApp";

interface SendBody {
  contactId: string;
  type: MessageType;
  message: string;
}

export async function POST(request: NextRequest) {
  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contactId, type, message } = body ?? {};

  if (!contactId || !type || !message?.trim()) {
    return NextResponse.json(
      { error: "contactId, type, and message are required" },
      { status: 400 }
    );
  }

  const validTypes: MessageType[] = ["SMS", "Email", "WhatsApp"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return NextResponse.json(
      { error: "GHL API credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          contactId,
          message: message.trim(),
          locationId,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: err.message ?? "Failed to send message" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach GHL API" },
      { status: 502 }
    );
  }
}
