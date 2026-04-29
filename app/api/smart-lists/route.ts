import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";
import type { Contact } from "@/types/contact";
import type { ContactFilter } from "@/types/filter";

export async function GET() {
  let connectionId: string;
  try {
    ({ connectionId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const { data, error } = await getSupabase()
    .from("app_smart_lists")
    .select(
      "id, created_at, updated_at, name, description, source_type, cached_contact_count, last_refreshed_at, is_archived",
    )
    .eq("connection_id", connectionId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch smart lists" }, { status: 500 });
  }

  return NextResponse.json({
    appSmartLists: data ?? [],
    importedGhlSmartLists: [], // GHL public API does not expose saved smart lists
  });
}

export async function POST(request: NextRequest) {
  let body: {
    name: string;
    description?: string;
    sourceType: "local_manual" | "local_dynamic";
    contacts?: Contact[];
    filterRules?: ContactFilter;
    searchQuery?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description, sourceType } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (sourceType !== "local_manual" && sourceType !== "local_dynamic") {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }
  if (
    sourceType === "local_manual" &&
    (!Array.isArray(body.contacts) || body.contacts.length === 0)
  ) {
    return NextResponse.json({ error: "contacts required for local_manual" }, { status: 400 });
  }
  if (sourceType === "local_dynamic" && !body.filterRules) {
    return NextResponse.json({ error: "filterRules required for local_dynamic" }, { status: 400 });
  }

  let connectionId: string, accountLabel: string;
  try {
    ({ connectionId, accountLabel } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const supabase = getSupabase();

  if (sourceType === "local_manual") {
    const contacts = body.contacts!;
    const { data: list, error: listErr } = await supabase
      .from("app_smart_lists")
      .insert({
        connection_id: connectionId,
        account_label: accountLabel,
        name: name.trim(),
        description: description?.trim() || null,
        source_type: "local_manual",
        cached_contact_count: contacts.length,
      })
      .select("id, name, source_type, cached_contact_count")
      .single();

    if (listErr || !list) {
      return NextResponse.json({ error: "Failed to create smart list" }, { status: 500 });
    }

    const { error: contactsErr } = await supabase.from("app_smart_list_contacts").insert(
      contacts.map((c) => ({
        smart_list_id: list.id,
        connection_id: connectionId,
        contact_id: c.contactId,
        contact_snapshot: c,
      })),
    );

    if (contactsErr) {
      await supabase.from("app_smart_lists").delete().eq("id", list.id);
      return NextResponse.json({ error: "Failed to save contacts" }, { status: 500 });
    }

    return NextResponse.json({ smartList: list }, { status: 201 });
  }

  // local_dynamic
  const { data: list, error: listErr } = await supabase
    .from("app_smart_lists")
    .insert({
      connection_id: connectionId,
      account_label: accountLabel,
      name: name.trim(),
      description: description?.trim() || null,
      source_type: "local_dynamic",
      filter_rules: body.filterRules,
      search_query: body.searchQuery?.trim() || null,
      cached_contact_count: 0,
    })
    .select("id, name, source_type, cached_contact_count")
    .single();

  if (listErr || !list) {
    return NextResponse.json({ error: "Failed to create smart list" }, { status: 500 });
  }

  return NextResponse.json({ smartList: list }, { status: 201 });
}
