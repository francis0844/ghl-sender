import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { connectionId } = await request.json();
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  // Check if it was the active connection before deleting
  const { data: toDelete } = await supabase
    .from("ghl_connections")
    .select("is_active")
    .eq("id", connectionId)
    .single();

  const { error } = await supabase
    .from("ghl_connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  let newActiveId: string | null = null;

  // If we deleted the active row, promote the most-recently-used remaining row
  if (toDelete?.is_active) {
    const { data: next } = await supabase
      .from("ghl_connections")
      .select("id")
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase
        .from("ghl_connections")
        .update({ is_active: true })
        .eq("id", next.id);
      newActiveId = next.id;
    }
  }

  return NextResponse.json({ success: true, newActiveId });
}
