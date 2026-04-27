import { NextResponse } from "next/server";
import { getActiveGHLToken, GHLNotConnectedError } from "@/lib/ghl-token";

const GHL_API = "https://services.leadconnectorhq.com";

export async function GET() {
  let accessToken: string, locationId: string;
  try {
    ({ accessToken, locationId } = await getActiveGHLToken());
  } catch (e) {
    if (e instanceof GHLNotConnectedError) {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
    throw e;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
  };

  const res = await fetch(
    `${GHL_API}/contacts/smart_lists?${new URLSearchParams({ locationId })}`,
    { headers, cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "GHL API error" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ smartLists: data.smart_lists ?? data.smartLists ?? [] });
}
