import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { connectionId } = await request.json();
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  const db = getSupabase();

  await db.from("ghl_connections").update({ is_active: false }).not("id", "is", null);

  const { data, error } = await db
    .from("ghl_connections")
    .update({ is_active: true, last_used_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select(
      "id, account_label, location_id, company_id, email, token_expires_at, is_active, last_used_at, created_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  return NextResponse.json({ connection: data });
}
