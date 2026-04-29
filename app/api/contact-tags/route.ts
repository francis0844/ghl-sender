import { NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { fetchContactsPage } from "@/lib/ghl-contacts";

const SAMPLE_PAGES = 5; // sample up to 500 contacts for tag discovery

export async function GET() {
  let accessToken: string, locationId: string;
  try {
    ({ accessToken, locationId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const tagSet = new Set<string>();

  for (let page = 1; page <= SAMPLE_PAGES; page++) {
    const { contacts, total } = await fetchContactsPage(
      accessToken,
      locationId,
      page,
      100,
    );

    for (const contact of contacts) {
      for (const tag of contact.tags) {
        if (tag.trim()) tagSet.add(tag.trim());
      }
    }

    const fetchedSoFar = (page - 1) * 100 + contacts.length;
    if (fetchedSoFar >= total || contacts.length < 100) break;
  }

  const tags = Array.from(tagSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return NextResponse.json({ tags });
}
