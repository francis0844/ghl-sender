import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";

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
    .from("smart_lists")
    .select("id, created_at, name, contact_count")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch smart lists" }, { status: 500 });
  }

  return NextResponse.json({ smartLists: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: { name: string; contacts: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, contacts } = body;
  if (!name?.trim() || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "name and contacts are required" }, { status: 400 });
  }

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
    .from("smart_lists")
    .insert({
      name: name.trim(),
      connection_id: connectionId,
      contact_count: contacts.length,
      contacts,
    })
    .select("id, created_at, name, contact_count")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create smart list" }, { status: 500 });
  }

  return NextResponse.json({ smartList: data }, { status: 201 });
}
