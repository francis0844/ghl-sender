import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const PUBLIC_COLS =
  "id, created_at, account_label, location_id, company_id, email, token_expires_at, is_active, last_used_at";

export async function GET() {
  const { data, error } = await getSupabase()
    .from("ghl_connections")
    .select(PUBLIC_COLS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }

  return NextResponse.json({ connections: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const { id, account_label } = await request.json();
  if (!id || !account_label?.trim()) {
    return NextResponse.json({ error: "id and account_label required" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("ghl_connections")
    .update({ account_label: account_label.trim() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
