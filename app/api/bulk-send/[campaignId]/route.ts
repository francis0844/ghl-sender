import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  const { data, error } = await getSupabase()
    .from("bulk_send_campaigns")
    .select(
      "id, created_at, account_label, message_type, message, recipient_count, sent_count, failed_count, status, smart_list_id, smart_list_name, completed_at"
    )
    .eq("id", campaignId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign: data });
}
