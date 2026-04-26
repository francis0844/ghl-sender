import { NextRequest, NextResponse } from "next/server";
import { refreshConnectionTokens } from "@/lib/ghl-token";

export async function POST(request: NextRequest) {
  const { connectionId } = await request.json();
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId required" }, { status: 400 });
  }

  try {
    const accessToken = await refreshConnectionTokens(connectionId);
    return NextResponse.json({ accessToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
