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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
  const search = params.get("search")?.trim() ?? "";

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

  // Use POST /contacts/search for both listing and searching — it supports page-based
  // pagination and works with or without a search query.
  const body: Record<string, unknown> = {
    locationId,
    page,
    pageLimit: limit,
  };
  if (search.length >= 1) body.query = search;

  const res = await fetch(`${GHL_API}/contacts/search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "GHL API error", status: res.status, detail },
      { status: 502 }
    );
  }

  const data = await res.json() as {
    contacts?: GHLContact[];
    total?: number;
    count?: number;
    meta?: { total?: number };
  };

  const contacts = (data.contacts ?? []).map(mapContact);
  const total = data.total ?? data.meta?.total ?? data.count ?? contacts.length;

  return NextResponse.json({ contacts, total, page, limit });
}
