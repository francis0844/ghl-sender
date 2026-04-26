import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/** Must match sessionToken() in proxy.ts — mixes in TOKEN_ENCRYPTION_KEY so the
 *  cookie value cannot be reproduced from the password alone via offline brute-force. */
function sessionToken(password: string): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY ?? "fallback";
  return createHash("sha256")
    .update(secret)
    .update(password)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const expected = process.env.APP_PASSWORD;

  if (!expected || body.password !== expected) {
    // Constant-time comparison is ideal; for a simple app this is fine
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = sessionToken(expected);

  const response = NextResponse.json({ success: true });
  response.cookies.set("ghl_session", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
