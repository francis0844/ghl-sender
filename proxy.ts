import { NextRequest, NextResponse } from "next/server";

/** Must match sessionToken() in app/api/auth/route.ts — mixes in TOKEN_ENCRYPTION_KEY
 *  so the cookie value cannot be reproduced from the password alone via offline brute-force. */
async function sessionToken(password: string): Promise<string> {
  const secret = process.env.TOKEN_ENCRYPTION_KEY ?? "fallback";
  // Encode secret+password as one UTF-8 buffer (same byte sequence as Node's .update(secret).update(password))
  const data = new TextEncoder().encode(secret + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const expected = await sessionToken(password);
  const cookie = request.cookies.get("ghl_session");

  if (!cookie || cookie.value !== expected) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
