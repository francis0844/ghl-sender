import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20")));
  const offset = (page - 1) * limit;

  const supabase = getSupabase();

  const { data, error, count } = await supabase
    .from("bulk_send_campaigns")
    .select(
      "id, created_at, account_label, message_type, message, recipient_count, sent_count, failed_count, status, smart_list_id, smart_list_name, completed_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data ?? [], total: count ?? 0, page, limit });
}
