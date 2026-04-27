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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: smartListId } = await params;

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
  };

  const allContacts: Contact[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const qs = new URLSearchParams({
      locationId,
      smartListId,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`${GHL_API}/contacts/?${qs}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "GHL API error" }, { status: res.status });
    }

    const data: { contacts?: GHLContact[] } = await res.json();
    const batch = data.contacts ?? [];
    allContacts.push(...batch.map(mapContact));

    if (batch.length < limit) break;
    page++;

    if (page > 50) break;
  }

  return NextResponse.json({ contacts: allContacts, total: allContacts.length });
}
