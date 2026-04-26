import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";

const GHL_API = "https://services.leadconnectorhq.com";

type GHLContact = {
  id: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  let accessToken: string, locationId: string;
  try {
    ({ accessToken, locationId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json(
        { error: "not_connected", message: "No active GHL account connected" },
        { status: 401 }
      );
    }
    throw e;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  // GHL v2 contacts search — POST with JSON body
  const res = await fetch(`${GHL_API}/contacts/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      locationId,
      query,
      limit: 10,
      page: 1,
    }),
    cache: "no-store",
  });

  // If POST search fails, fall back to GET list endpoint
  let data: { contacts?: GHLContact[] };
  if (!res.ok) {
    const fallback = await fetch(
      `${GHL_API}/contacts/?${new URLSearchParams({ locationId, query, limit: "10" })}`,
      { headers, cache: "no-store" }
    );
    if (!fallback.ok) {
      const err = await fallback.text();
      return NextResponse.json(
        { error: "GHL API error", detail: err },
        { status: fallback.status }
      );
    }
    data = await fallback.json();
  } else {
    data = await res.json();
  }

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
}
