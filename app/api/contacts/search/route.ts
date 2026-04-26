import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return NextResponse.json(
      { error: "GHL API credentials not configured" },
      { status: 500 }
    );
  }

  const ghlUrl = new URL(
    "https://services.leadconnectorhq.com/contacts/search"
  );
  ghlUrl.searchParams.set("locationId", locationId);
  ghlUrl.searchParams.set("q", query);
  ghlUrl.searchParams.set("limit", "10");

  try {
    const response = await fetch(ghlUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
      },
      // Prevent Next.js from caching GHL responses
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "GHL API error" },
        { status: response.status }
      );
    }

    const data = await response.json();

    type GHLContact = {
      id: string;
      contactName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    };

    const contacts = (data.contacts ?? []).map((c: GHLContact) => ({
      contactId: c.id,
      name:
        c.contactName ||
        `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
        "Unknown",
      phone: c.phone ?? null,
      email: c.email ?? null,
    }));

    return NextResponse.json({ contacts });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach GHL API" },
      { status: 502 }
    );
  }
}
