import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getPagedFilteredContacts } from "@/lib/contact-resolver";
import type { ContactFilter } from "@/types/filter";

export async function POST(request: NextRequest) {
  let body: {
    page?: number;
    limit?: number;
    search?: string;
    filter_rules: ContactFilter;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { filter_rules, search } = body;
  const page = Math.max(1, body.page ?? 1);
  const limit = Math.min(100, Math.max(1, body.limit ?? 20));

  if (!filter_rules || typeof filter_rules !== "object") {
    return NextResponse.json({ error: "filter_rules is required" }, { status: 400 });
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

  const result = await getPagedFilteredContacts(
    accessToken,
    locationId,
    filter_rules,
    page,
    limit,
    search,
  );

  return NextResponse.json(result);
}
