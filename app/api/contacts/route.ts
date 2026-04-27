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
  const sortField = params.get("sortField") ?? "dateAdded";
  const sortOrder = params.get("sortOrder") ?? "desc";
  const filter = params.get("filter") ?? "";

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

  let data: { contacts?: GHLContact[]; meta?: { total?: number } };

  if (search.length >= 2) {
    const res = await fetch(`${GHL_API}/contacts/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationId,
        query: search,
        page,
        pageLimit: limit,
        sortBy: sortField,
        sortDirection: sortOrder,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "GHL API error" }, { status: res.status });
    }
    data = await res.json();
  } else {
    const qs = new URLSearchParams({
      locationId,
      page: String(page),
      limit: String(limit),
      sortBy: sortField,
      sortDirection: sortOrder,
    });
    if (filter === "hasPhone") qs.set("phone", "true");
    if (filter === "hasEmail") qs.set("email", "true");
    const res = await fetch(`${GHL_API}/contacts/?${qs}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "GHL API error" }, { status: res.status });
    }
    data = await res.json();
  }

  const contacts = (data.contacts ?? []).map(mapContact);
  const total = (data as { meta?: { total?: number } }).meta?.total ?? contacts.length;

  return NextResponse.json({ contacts, total, page, limit });
}
