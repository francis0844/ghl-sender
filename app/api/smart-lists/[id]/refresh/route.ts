import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";
import { resolveAllFiltered } from "@/lib/contact-resolver";
import type { ContactFilter } from "@/types/filter";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let accessToken: string, locationId: string, connectionId: string;
  try {
    ({ accessToken, locationId, connectionId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const supabase = getSupabase();

  const { data: list, error: listErr } = await supabase
    .from("app_smart_lists")
    .select("id, source_type, filter_rules, search_query")
    .eq("id", id)
    .eq("connection_id", connectionId)
    .single();

  if (listErr || !list) {
    return NextResponse.json({ error: "Smart list not found" }, { status: 404 });
  }

  if (list.source_type !== "local_dynamic") {
    return NextResponse.json(
      { error: "Refresh is only supported for dynamic lists" },
      { status: 400 },
    );
  }

  const filterRules = list.filter_rules as ContactFilter | null;
  if (!filterRules) {
    return NextResponse.json({ error: "No filter rules configured" }, { status: 400 });
  }

  const { contacts, capped } = await resolveAllFiltered(
    accessToken,
    locationId,
    filterRules,
    list.search_query ?? undefined,
  );

  const lastRefreshedAt = new Date().toISOString();
  await supabase
    .from("app_smart_lists")
    .update({ cached_contact_count: contacts.length, last_refreshed_at: lastRefreshedAt })
    .eq("id", id);

  return NextResponse.json({ count: contacts.length, capped, lastRefreshedAt });
}
