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

  const params = new URLSearchParams({
    locationId,
    q: query,
    limit: "10",
  });

  const res = await fetch(`${GHL_API}/contacts/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Version: "2021-07-28" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "GHL API error" }, { status: res.status });
  }

  const data = await res.json();
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
