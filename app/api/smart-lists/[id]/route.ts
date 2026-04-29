import { NextRequest, NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    .select("*")
    .eq("id", id)
    .eq("connection_id", connectionId)
    .eq("is_archived", false)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Smart list not found" }, { status: 404 });
  }

  return NextResponse.json({ smartList: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = trimmed;
  }
  if (body.description !== undefined) {
    updates.description = body.description.trim() || null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
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

  const { error } = await getSupabase()
    .from("app_smart_lists")
    .update(updates)
    .eq("id", id)
    .eq("connection_id", connectionId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let connectionId: string;
  try {
    ({ connectionId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const { error } = await getSupabase()
    .from("app_smart_lists")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("connection_id", connectionId);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
