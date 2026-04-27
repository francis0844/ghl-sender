import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import type { Contact } from "@/types/contact";

const GHL_API = "https://services.leadconnectorhq.com";

type GHLContact = {
  id: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  dateAdded?: string;
};

function mapContact(c: GHLContact): Contact {
  const firstName = c.firstName ?? "";
  const lastName = c.lastName ?? "";
  return {
    contactId: c.id,
    name: c.contactName || `${firstName} ${lastName}`.trim() || "Unknown",
    firstName,
    lastName,
    phone: c.phone ?? null,
    email: c.email ?? null,
    tags: c.tags ?? [],
    dateAdded: c.dateAdded ?? null,
    hasPhone: !!c.phone,
    hasEmail: !!c.email,
  };
}

const VALID_IDS = ["all", "has-phone", "has-email"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: filterId } = await params;

  if (!VALID_IDS.includes(filterId)) {
    return NextResponse.json({ error: "Unknown filter" }, { status: 404 });
  }

  let accessToken: string, locationId: string;
  try {
    ({ accessToken, locationId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const allContacts: Contact[] = [];
  let page = 1;
  const pageLimit = 100;

  while (true) {
    const body: Record<string, unknown> = { locationId, page, pageLimit };

    const res = await fetch(`${GHL_API}/contacts/search`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "GHL API error", detail },
        { status: 502 }
      );
    }

    const data = await res.json() as { contacts?: GHLContact[] };
    const batch = data.contacts ?? [];

    for (const c of batch) {
      const mapped = mapContact(c);
      if (filterId === "has-phone" && !mapped.hasPhone) continue;
      if (filterId === "has-email" && !mapped.hasEmail) continue;
      allContacts.push(mapped);
    }

    if (batch.length < pageLimit) break;
    page++;
    if (page > 100) break; // safety cap at 10,000 contacts
  }

  return NextResponse.json({ contacts: allContacts, total: allContacts.length });
}
