import type { Contact } from "@/types/contact";

const GHL_API = "https://services.leadconnectorhq.com";

export type GHLContact = {
  id: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  dateAdded?: string;
};

export function mapGHLContact(c: GHLContact): Contact {
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

type RawPageData = {
  contacts?: GHLContact[];
  total?: number;
  count?: number;
  meta?: { total?: number };
};

function ghlHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

export interface FetchPageResult {
  contacts: Contact[];
  total: number;
}

export async function fetchContactsPage(
  accessToken: string,
  locationId: string,
  page: number,
  pageLimit: number,
  query?: string,
): Promise<FetchPageResult> {
  const body: Record<string, unknown> = { locationId, page, pageLimit };
  if (query) body.query = query;

  const res = await fetch(`${GHL_API}/contacts/search`, {
    method: "POST",
    headers: ghlHeaders(accessToken),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GHL contacts/search failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as RawPageData;
  const contacts = (data.contacts ?? []).map(mapGHLContact);
  const total = data.total ?? data.meta?.total ?? data.count ?? contacts.length;

  return { contacts, total };
}

export async function fetchContactById(
  accessToken: string,
  contactId: string,
): Promise<Contact | null> {
  const res = await fetch(`${GHL_API}/contacts/${contactId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: "2021-07-28",
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GHL contacts/${contactId} failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as { contact?: GHLContact };
  if (!data.contact) return null;
  return mapGHLContact(data.contact);
}
