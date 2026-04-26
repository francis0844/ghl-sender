import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/** Must match the token derivation in middleware.ts */
function sessionToken(password: string): string {
  return createHash("sha256").update(password).digest("hex");
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
