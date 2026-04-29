import type { Contact } from "@/types/contact";
import type { ContactFilter } from "@/types/filter";
import { fetchContactsPage, fetchContactById } from "./ghl-contacts";
import { matchesFilter } from "./contact-filter";

const GHL_PAGE_SIZE = 100;
const MAX_GHL_PAGES = 100;   // 10,000 GHL contacts max
const MAX_RESOLVE_ALL = 5000; // filtered results cap
const MAX_RESOLVE_IDS = 500;  // by-ID cap

export interface PagedFilterResult {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  /** True when the safety cap (MAX_RESOLVE_ALL) was reached. */
  capped: boolean;
}

export interface ResolveAllResult {
  contacts: Contact[];
  capped: boolean;
}

/**
 * Fetches all GHL contacts matching the given filter (up to MAX_RESOLVE_ALL),
 * then returns the requested page slice.
 */
export async function getPagedFilteredContacts(
  accessToken: string,
  locationId: string,
  filter: ContactFilter,
  page: number,
  limit: number,
  search?: string,
): Promise<PagedFilterResult> {
  const { contacts: all, capped } = await resolveAllFiltered(
    accessToken,
    locationId,
    filter,
    search,
  );
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + limit);

  return {
    contacts: slice,
    total: all.length,
    page,
    limit,
    hasMore: start + limit < all.length,
    capped,
  };
}

/**
 * Pages through GHL contacts (100/page) and applies the filter client-side.
 * Stops when all contacts are exhausted or MAX_RESOLVE_ALL is reached.
 */
export async function resolveAllFiltered(
  accessToken: string,
  locationId: string,
  filter: ContactFilter,
  search?: string,
): Promise<ResolveAllResult> {
  const matched: Contact[] = [];
  let capped = false;

  for (let pageNum = 1; pageNum <= MAX_GHL_PAGES; pageNum++) {
    const { contacts, total } = await fetchContactsPage(
      accessToken,
      locationId,
      pageNum,
      GHL_PAGE_SIZE,
      search,
    );

    for (const contact of contacts) {
      if (matchesFilter(contact, filter)) {
        matched.push(contact);
        if (matched.length >= MAX_RESOLVE_ALL) {
          capped = true;
          break;
        }
      }
    }

    if (capped) break;

    const fetchedSoFar = (pageNum - 1) * GHL_PAGE_SIZE + contacts.length;
    if (fetchedSoFar >= total || contacts.length < GHL_PAGE_SIZE) break;
  }

  return { contacts: matched, capped };
}

/**
 * Fetches up to MAX_RESOLVE_IDS contacts by ID, batching 10 concurrent requests.
 */
export async function resolveByIds(
  accessToken: string,
  contactIds: string[],
): Promise<Contact[]> {
  const ids = contactIds.slice(0, MAX_RESOLVE_IDS);
  const results: Contact[] = [];
  const BATCH = 10;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map((id) => fetchContactById(accessToken, id)),
    );
    for (const c of fetched) {
      if (c) results.push(c);
    }
  }

  return results;
}
