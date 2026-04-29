import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { resolveAllFiltered, resolveByIds } from "@/lib/contact-resolver";
import type { Contact } from "@/types/contact";
import type { ContactFilter } from "@/types/filter";

type SelectionMode = "contacts" | "ids" | "filtered" | "smart_list";

type RequestBody =
  | { mode: "contacts"; contacts: Contact[] }
  | { mode: "ids"; contact_ids: string[] }
  | { mode: "filtered"; filter_rules: ContactFilter; search_query?: string }
  | { mode: "smart_list"; smart_list_uuid: string };

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.mode) {
    return NextResponse.json({ error: "mode is required" }, { status: 400 });
  }

  if (body.mode === "smart_list") {
    return NextResponse.json(
      { error: "smart_list mode not yet implemented" },
      { status: 501 },
    );
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

  let contacts: Contact[];

  switch (body.mode) {
    case "contacts": {
      if (!Array.isArray(body.contacts)) {
        return NextResponse.json({ error: "contacts array required" }, { status: 400 });
      }
      contacts = body.contacts;
      break;
    }
    case "ids": {
      if (!Array.isArray(body.contact_ids) || body.contact_ids.length === 0) {
        return NextResponse.json({ error: "contact_ids array required" }, { status: 400 });
      }
      contacts = await resolveByIds(accessToken, body.contact_ids);
      break;
    }
    case "filtered": {
      if (!body.filter_rules || typeof body.filter_rules !== "object") {
        return NextResponse.json({ error: "filter_rules required" }, { status: 400 });
      }
      const { contacts: all } = await resolveAllFiltered(
        accessToken,
        locationId,
        body.filter_rules,
        body.search_query,
      );
      contacts = all;
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  return NextResponse.json({ contacts, total: contacts.length });
}
